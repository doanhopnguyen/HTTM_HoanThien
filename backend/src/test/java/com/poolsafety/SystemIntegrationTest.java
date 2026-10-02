package com.poolsafety;

import com.poolsafety.user.*;
import com.poolsafety.incident.*;
import com.poolsafety.notification.NotificationService;
import com.poolsafety.common.ApiException;
import com.poolsafety.auth.AuthService;
import com.poolsafety.auth.AuthDto;
import com.fasterxml.jackson.databind.*;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.http.MediaType;
import java.time.Instant;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class SystemIntegrationTest {
    static final String KEY="integration-ai-key-abcdefghijklmnopqrstuvwxyz";
    static final String PASSWORD="Development-Test-123!";
    static final String HASH=new BCryptPasswordEncoder(4).encode(PASSWORD);
    static final EmbeddedPostgres PG;
    static {try{PG=EmbeddedPostgres.builder().start();}catch(Exception ex){throw new ExceptionInInitializerError(ex);}}
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r){r.add("spring.datasource.url",()->PG.getJdbcUrl("postgres","postgres"));r.add("spring.datasource.username",()->"postgres");r.add("spring.datasource.password",()->"");r.add("app.jwt-secret",()->"integration-jwt-secret-abcdefghijklmnopqrstuvwxyz");r.add("app.ai-service-key",()->KEY);}
    @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired JdbcTemplate sql;@Autowired UserRepository users;@Autowired IncidentService incidents;
    @Autowired AuthService authService;
    @MockitoSpyBean NotificationService notificationService;
    @LocalServerPort int port;
    User admin,staff,other;String adminToken,staffToken,otherToken;
    @BeforeEach void setup() throws Exception {
        reset(notificationService);
        sql.execute("TRUNCATE audit_logs,notifications,incident_history,incidents,detection_events,cameras,refresh_tokens,users CASCADE");
        admin=user("admin",Role.ADMIN);staff=user("staff",Role.STAFF);other=user("other",Role.STAFF);
        adminToken=login("admin").path("accessToken").asText();staffToken=login("staff").path("accessToken").asText();otherToken=login("other").path("accessToken").asText();
    }
    User user(String name,Role role){var u=new User();u.setUsername(name);u.setEmail(name+"@example.test");u.setFullName(name+" Lifeguard");u.setRole(role);u.setPasswordHash(HASH);return users.save(u);}
    JsonNode login(String username) throws Exception{return read(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("username",username,"password",PASSWORD)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());}
    JsonNode read(String text)throws Exception{return json.readTree(text);}
    UUID camera()throws Exception{return UUID.fromString(read(mvc.perform(post("/api/cameras").header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"CAM-01\",\"name\":\"Deep pool\",\"status\":\"ONLINE\",\"monitoringEnabled\":true}" )).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("id").asText());}
    String detection(UUID camera)throws Exception{return json.writeValueAsString(Map.of("cameraId",camera,"eventType","DROWNING","confidence",0.94,"detectedAt",Instant.now().minusSeconds(1).toString()));}
    UUID incident(UUID camera)throws Exception{return UUID.fromString(read(mvc.perform(post("/api/detection-events").header("X-AI-SERVICE-KEY",KEY).contentType(MediaType.APPLICATION_JSON).content(detection(camera))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("incidentId").asText());}
    @Test void endToEndIncidentHasHistoryNotificationsAndStatistics()throws Exception{
        var id=incident(camera());
        mvc.perform(patch("/api/incidents/"+id+"/acknowledge").header("Authorization","Bearer "+staffToken)).andExpect(status().isOk()).andExpect(jsonPath("$.handledBy.id").value(staff.getId().toString()));
        mvc.perform(patch("/api/incidents/"+id+"/start").header("Authorization","Bearer "+staffToken)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("IN_PROGRESS"));
        mvc.perform(patch("/api/incidents/"+id+"/resolve").header("Authorization","Bearer "+staffToken).contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"Swimmer rescued\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("RESOLVED"));
        mvc.perform(get("/api/incidents/"+id+"/history").header("Authorization","Bearer "+adminToken)).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(4));
        mvc.perform(get("/api/dashboard/summary").header("Authorization","Bearer "+adminToken)).andExpect(status().isOk()).andExpect(jsonPath("$.activeIncidents").value(0)).andExpect(jsonPath("$.resolvedToday").value(1));
        mvc.perform(get("/api/notifications/unread-count").header("Authorization","Bearer "+staffToken)).andExpect(jsonPath("$.count").value(4));
    }
    @Test void refreshRotationRejectsReplayAndLogoutRevokesAccess()throws Exception{
        var session=login("staff");String raw=session.path("refreshToken").asText();
        var result=read(mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("refreshToken",raw)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("refreshToken",raw)))).andExpect(status().isUnauthorized());
        assertEquals(0,sql.queryForObject("SELECT count(*) FROM refresh_tokens WHERE token_hash=?",Integer.class,raw));
        String token=result.path("accessToken").asText();mvc.perform(post("/api/auth/logout").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("refreshToken",result.path("refreshToken").asText())))).andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
    }
    @Test void invalidLoginAndDisabledAccountAreDenied()throws Exception{
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"admin\",\"password\":\"wrong\"}")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/users/"+staff.getId()+"/status").header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DISABLED\"}")).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+staffToken)).andExpect(status().isUnauthorized());
    }
    @Test void competingRefreshesHaveExactlyOneWinner()throws Exception{
        String raw=login("staff").path("refreshToken").asText();var gate=new CountDownLatch(1);
        Callable<String> rotate=()->{gate.await();try{authService.rotate(new AuthDto.Refresh(raw,"test"));return "OK";}catch(ApiException ex){return ex.getCode();}};
        try(var executor=Executors.newFixedThreadPool(2)){
            var a=executor.submit(rotate);var b=executor.submit(rotate);gate.countDown();var results=List.of(a.get(10,TimeUnit.SECONDS),b.get(10,TimeUnit.SECONDS));
            assertEquals(1,results.stream().filter("OK"::equals).count());assertEquals(1,results.stream().filter("INVALID_REFRESH_TOKEN"::equals).count());
        }
    }
    @Test void staffCannotManageCamerasUsersOrAudit()throws Exception{
        mvc.perform(post("/api/cameras").header("Authorization","Bearer "+staffToken).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        mvc.perform(get("/api/users").header("Authorization","Bearer "+staffToken)).andExpect(status().isForbidden());
        mvc.perform(get("/api/audit-logs").header("Authorization","Bearer "+staffToken)).andExpect(status().isForbidden());
        mvc.perform(get("/api/cameras")).andExpect(status().isUnauthorized());
    }
    @Test void detectionRequiresServiceKeyAndMonitoredCamera()throws Exception{
        var c=camera();String body=detection(c);
        mvc.perform(post("/api/detection-events").header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/cameras/"+c+"/monitoring").header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}")).andExpect(status().isOk());
        mvc.perform(post("/api/detection-events").header("X-AI-SERVICE-KEY",KEY).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict());
        assertEquals(0,sql.queryForObject("SELECT count(*) FROM incidents",Integer.class));
    }
    @Test void invalidConfidenceRejectedAndCameraHistoryPreserved()throws Exception{
        var c=camera();mvc.perform(post("/api/detection-events").header("X-AI-SERVICE-KEY",KEY).contentType(MediaType.APPLICATION_JSON).content(detection(c).replace("0.94","1.94"))).andExpect(status().isBadRequest());
        incident(c);mvc.perform(delete("/api/cameras/"+c).header("Authorization","Bearer "+adminToken)).andExpect(status().isNoContent());
        mvc.perform(get("/api/cameras/"+c).header("Authorization","Bearer "+adminToken)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DISABLED"));
    }
    @Test void cameraOfflineNotificationsAreNotDuplicatedAndCredentialsAreMasked()throws Exception{
        var c=camera();
        mvc.perform(patch("/api/cameras/"+c).header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content("{\"streamUrl\":\"rtsp://camerauser:private-password@192.168.1.10/live\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.streamUrl").isEmpty()).andExpect(jsonPath("$.streamUrlMasked").value("rtsp://192.168.1.10/live"));
        for(int n=0;n<2;n++)mvc.perform(patch("/api/cameras/"+c+"/status").header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"OFFLINE\"}")).andExpect(status().isOk());
        assertEquals(3,sql.queryForObject("select count(*) from notifications where type='CAMERA_OFFLINE'",Integer.class));
    }
    @Test void openApiDocumentsSeparateUserAndServiceAuthentication()throws Exception{
        mvc.perform(get("/api-docs")).andExpect(status().isOk()).andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer")).andExpect(jsonPath("$.components.securitySchemes.aiServiceKey.name").value("X-AI-SERVICE-KEY"));
    }
    @Test void competingAcknowledgementsHaveExactlyOneWinner()throws Exception{
        var id=incident(camera());var gate=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)){
            Callable<String> first=()->{gate.await();return ack(staff,id);};Callable<String> second=()->{gate.await();return ack(other,id);};
            var a=executor.submit(first);var b=executor.submit(second);gate.countDown();var results=List.of(a.get(10,TimeUnit.SECONDS),b.get(10,TimeUnit.SECONDS));
            assertEquals(1,results.stream().filter("OK"::equals).count());assertEquals(1,results.stream().filter("INCIDENT_ALREADY_ASSIGNED"::equals).count());
        }
    }
    String ack(User actor,UUID id){try{incidents.transition(actor,id,IncidentStatus.ACKNOWLEDGED,null);return "OK";}catch(ApiException ex){return ex.getCode();}}
    @Test void assignedIncidentCannotBeTakenAndTerminalStateCannotReopen()throws Exception{
        var id=incident(camera());incidents.transition(staff,id,IncidentStatus.ACKNOWLEDGED,null);
        mvc.perform(patch("/api/incidents/"+id+"/start").header("Authorization","Bearer "+otherToken)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INCIDENT_ALREADY_ASSIGNED"));
        incidents.transition(staff,id,IncidentStatus.RESOLVED,"Rescued");
        mvc.perform(patch("/api/incidents/"+id+"/acknowledge").header("Authorization","Bearer "+staffToken)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INVALID_INCIDENT_TRANSITION"));
    }
    @Test void notificationOwnershipAndReadAll()throws Exception{
        incident(camera());String id=sql.queryForObject("SELECT id::text FROM notifications WHERE user_id=? LIMIT 1",String.class,other.getId());
        mvc.perform(patch("/api/notifications/"+id+"/read").header("Authorization","Bearer "+staffToken)).andExpect(status().isNotFound());
        mvc.perform(patch("/api/notifications/read-all").header("Authorization","Bearer "+staffToken)).andExpect(status().isNoContent());
        mvc.perform(get("/api/notifications/unread-count").header("Authorization","Bearer "+staffToken)).andExpect(jsonPath("$.count").value(0));
    }
    @Test void notificationFailureRollsBackWholeDetectionTransaction()throws Exception{
        var c=camera();doThrow(new IllegalStateException("test notification failure")).when(notificationService).alert(any(),anyString(),anyString(),anyString());
        mvc.perform(post("/api/detection-events").header("X-AI-SERVICE-KEY",KEY).contentType(MediaType.APPLICATION_JSON).content(detection(c))).andExpect(status().isInternalServerError());
        assertEquals(0,sql.queryForObject("SELECT count(*) FROM detection_events",Integer.class));assertEquals(0,sql.queryForObject("SELECT count(*) FROM incidents",Integer.class));assertEquals(0,sql.queryForObject("SELECT count(*) FROM incident_history",Integer.class));
    }
    @Test void realWebSocketReceivesCommittedIncidentAndOnlyOwnNotification()throws Exception{
        var queue=new LinkedBlockingQueue<String>();
        var listener=new WebSocket.Listener(){final StringBuilder buffer=new StringBuilder();public void onOpen(WebSocket ws){ws.request(1);}public CompletionStage<?> onText(WebSocket ws,CharSequence text,boolean last){buffer.append(text);if(last){queue.add(buffer.toString());buffer.setLength(0);}ws.request(1);return CompletableFuture.completedFuture(null);}};
        var ws=HttpClient.newHttpClient().newWebSocketBuilder().header("Origin","http://localhost:5173").buildAsync(URI.create("ws://localhost:"+port+"/ws"),listener).get(10,TimeUnit.SECONDS);
        try{
            ws.sendText(json.writeValueAsString(Map.of("type","AUTH","token",staffToken)),true).join();assertEquals("AUTHENTICATED",read(queue.poll(5,TimeUnit.SECONDS)).path("type").asText());
            var id=incident(camera());boolean event=false,notification=false;
            for(int n=0;n<3;n++){var message=read(queue.poll(5,TimeUnit.SECONDS));if(message.path("type").asText().equals("INCIDENT_CREATED")){event=true;assertEquals(id.toString(),message.path("data").path("id").asText());}if(message.path("type").asText().equals("NOTIFICATION_CREATED"))notification=true;}
            assertTrue(event);assertTrue(notification);assertEquals(0,queue.size());
        }finally{ws.sendClose(WebSocket.NORMAL_CLOSURE,"done").join();}
    }
    @Test void changePasswordInvalidatesOldSessions()throws Exception{
        mvc.perform(post("/api/auth/change-password").header("Authorization","Bearer "+staffToken).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentPassword",PASSWORD,"newPassword","New-Password-123!")))).andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+staffToken)).andExpect(status().isUnauthorized());
    }
    @Test void corsAllowsConfiguredClientAndRejectsUnknownOrigin()throws Exception{
        mvc.perform(options("/api/auth/login").header("Origin","http://localhost:5173")
                .header("Access-Control-Request-Method","POST").header("Access-Control-Request-Headers","content-type"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","http://localhost:5173"));
        mvc.perform(options("/api/auth/login").header("Origin","https://untrusted.example")
                .header("Access-Control-Request-Method","POST"))
            .andExpect(status().isForbidden()).andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
    @AfterAll static void stop()throws Exception{PG.close();}
}
