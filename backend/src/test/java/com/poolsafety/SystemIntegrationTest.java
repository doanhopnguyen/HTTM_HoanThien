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
    // ---- Error format -------------------------------------------------------------------------
    @Test void frameworkErrorsUseUnifiedFormatInsteadOf500()throws Exception{
        mvc.perform(get("/api/does-not-exist").header("Authorization","Bearer "+adminToken)).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND")).andExpect(jsonPath("$.path").value("/api/does-not-exist"));
        mvc.perform(put("/api/cameras").header("Authorization","Bearer "+adminToken)).andExpect(status().isMethodNotAllowed()).andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
        mvc.perform(get("/api/incidents").param("status","BOGUS").header("Authorization","Bearer "+adminToken)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Invalid value for parameter 'status'"));
        mvc.perform(post("/api/cameras").header("Authorization","Bearer "+adminToken).contentType(MediaType.TEXT_PLAIN).content("x")).andExpect(status().isUnsupportedMediaType());
        mvc.perform(post("/api/cameras").header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content("{bad")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }
    // ---- Admin override -----------------------------------------------------------------------
    @Test void adminCanResolveIncidentHandledByStaffAndItIsRecorded()throws Exception{
        var id=incident(camera());incidents.transition(staff,id,IncidentStatus.ACKNOWLEDGED,null);incidents.transition(staff,id,IncidentStatus.IN_PROGRESS,null);
        mvc.perform(patch("/api/incidents/"+id+"/acknowledge").header("Authorization","Bearer "+adminToken)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INCIDENT_ALREADY_ASSIGNED"));
        mvc.perform(patch("/api/incidents/"+id+"/resolve").header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"Closed from control room\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("RESOLVED")).andExpect(jsonPath("$.handledBy.id").value(admin.getId().toString()));
        assertEquals(1,sql.queryForObject("SELECT count(*) FROM incident_history WHERE incident_id=? AND note LIKE 'Override of staff Lifeguard%'",Integer.class,id));
        assertEquals(1,sql.queryForObject("SELECT count(*) FROM incident_history WHERE incident_id=? AND action='ADMIN_OVERRIDE_RESOLVED' AND performed_by=?",Integer.class,id,admin.getId()));
        assertEquals(1,sql.queryForObject("SELECT count(*) FROM audit_logs WHERE action='ADMIN_OVERRIDE' AND entity_id=?",Integer.class,id));
        assertEquals(1,sql.queryForObject("SELECT count(*) FROM notifications WHERE type='INCIDENT_OVERRIDDEN' AND user_id=?",Integer.class,staff.getId()));
        mvc.perform(get("/api/incidents/"+id+"/history").header("Authorization","Bearer "+adminToken)).andExpect(jsonPath("$.content[0].action").value("DETECTED")).andExpect(jsonPath("$.content[3].action").value("ADMIN_OVERRIDE_RESOLVED"));
    }
    @Test void adminCanMarkFalseAlarmOnAcknowledgedIncidentButStaffCannotOverride()throws Exception{
        var id=incident(camera());incidents.transition(staff,id,IncidentStatus.ACKNOWLEDGED,null);
        mvc.perform(patch("/api/incidents/"+id+"/false-alarm").header("Authorization","Bearer "+otherToken).contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"x\"}")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INCIDENT_ALREADY_ASSIGNED"));
        mvc.perform(patch("/api/incidents/"+id+"/false-alarm").header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"Reflection on water\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("FALSE_ALARM"));
        mvc.perform(patch("/api/incidents/"+id+"/resolve").header("Authorization","Bearer "+otherToken).contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"x\"}")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INVALID_INCIDENT_TRANSITION"));
    }
    @Test void falseAlarmThroughApiAndStaffRestrictionWhenDisabled()throws Exception{
        var c=camera();var first=incident(c);
        mvc.perform(patch("/api/incidents/"+first+"/false-alarm").header("Authorization","Bearer "+staffToken).contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"Shadow\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("FALSE_ALARM")).andExpect(jsonPath("$.resolutionNote").value("Shadow"));
        mvc.perform(patch("/api/incidents/"+first+"/false-alarm").header("Authorization","Bearer "+staffToken).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
        var target=(IncidentService)org.springframework.test.util.AopTestUtils.getTargetObject(incidents);
        org.springframework.test.util.ReflectionTestUtils.setField(target,"staffFalseAlarm",false);
        try{
            var second=incident(c);
            mvc.perform(patch("/api/incidents/"+second+"/false-alarm").header("Authorization","Bearer "+staffToken).contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"Shadow\"}")).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FALSE_ALARM_NOT_ALLOWED"));
        }finally{org.springframework.test.util.ReflectionTestUtils.setField(target,"staffFalseAlarm",true);}
    }
    @Test void incidentListAcceptsSeveralStatuses()throws Exception{
        var c=camera();var a=incident(c);incident(c);var closed=incident(c);
        incidents.transition(staff,a,IncidentStatus.ACKNOWLEDGED,null);incidents.transition(staff,closed,IncidentStatus.FALSE_ALARM,"x");
        mvc.perform(get("/api/incidents").param("status","NEW","ACKNOWLEDGED").header("Authorization","Bearer "+staffToken)).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get("/api/incidents").param("status","FALSE_ALARM").param("handledBy",staff.getId().toString()).header("Authorization","Bearer "+staffToken)).andExpect(jsonPath("$.totalElements").value(1));
    }
    // ---- Users --------------------------------------------------------------------------------
    @Test void adminResetsPasswordAndSessionsAreRevoked()throws Exception{
        String body=json.writeValueAsString(Map.of("newPassword","Reset-Password-456!"));
        mvc.perform(patch("/api/users/"+other.getId()+"/password").header("Authorization","Bearer "+staffToken).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/users/"+staff.getId()+"/password").header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content("{\"newPassword\":\"short\"}")).andExpect(status().isBadRequest());
        mvc.perform(patch("/api/users/"+staff.getId()+"/password").header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").header("Authorization","Bearer "+staffToken)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("username","staff","password","Reset-Password-456!")))).andExpect(status().isOk());
        assertEquals(1,sql.queryForObject("SELECT count(*) FROM audit_logs WHERE action='RESET_PASSWORD' AND entity_id=?",Integer.class,staff.getId()));
        mvc.perform(patch("/api/users/"+admin.getId()+"/password").header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SELF_RESET"));
    }
    @Test void userFiltersAndStaffListExcludesDisabled()throws Exception{
        mvc.perform(patch("/api/users/"+other.getId()+"/status").header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DISABLED\"}")).andExpect(status().isOk());
        mvc.perform(get("/api/users/staff").header("Authorization","Bearer "+adminToken)).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].username").value("staff"));
        mvc.perform(get("/api/users").param("role","STAFF").header("Authorization","Bearer "+adminToken)).andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get("/api/users").param("status","DISABLED").header("Authorization","Bearer "+adminToken)).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/users").param("search","ADMIN lifeguard").header("Authorization","Bearer "+adminToken)).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/users").param("search","%").header("Authorization","Bearer "+adminToken)).andExpect(jsonPath("$.totalElements").value(0));
    }
    @Test void staffIsForbiddenFromEveryManagementMutation()throws Exception{
        var c=camera();String t="Bearer "+staffToken;
        mvc.perform(patch("/api/cameras/"+c).header("Authorization",t).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"x\"}")).andExpect(status().isForbidden());
        mvc.perform(patch("/api/cameras/"+c+"/monitoring").header("Authorization",t).contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}")).andExpect(status().isForbidden());
        mvc.perform(patch("/api/cameras/"+c+"/status").header("Authorization",t).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"OFFLINE\"}")).andExpect(status().isForbidden());
        mvc.perform(delete("/api/cameras/"+c).header("Authorization",t)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/users/"+other.getId()).header("Authorization",t).contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":\"x\"}")).andExpect(status().isForbidden());
        mvc.perform(get("/api/users/staff").header("Authorization",t)).andExpect(status().isForbidden());
        mvc.perform(get("/api/dashboard/report").header("Authorization",t)).andExpect(status().isForbidden());
        mvc.perform(get("/api/cameras/"+c).header("Authorization",t)).andExpect(status().isOk());
        mvc.perform(get("/api/dashboard/summary").header("Authorization",t)).andExpect(status().isOk());
    }
    // ---- Cameras ------------------------------------------------------------------------------
    @Test void cameraValidationFiltersDeleteAndOnline()throws Exception{
        var c=camera();String t="Bearer "+adminToken;
        mvc.perform(post("/api/cameras").header("Authorization",t).contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"CAM-01\",\"name\":\"Dup\",\"status\":\"ONLINE\",\"monitoringEnabled\":true}")).andExpect(status().isConflict());
        mvc.perform(post("/api/cameras").header("Authorization",t).contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"bad code!\",\"name\":\"x\",\"status\":\"ONLINE\",\"monitoringEnabled\":true}")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        var second=UUID.fromString(read(mvc.perform(post("/api/cameras").header("Authorization",t).contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"CAM-02\",\"name\":\"Kids area\",\"status\":\"OFFLINE\",\"monitoringEnabled\":false}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("id").asText());
        mvc.perform(get("/api/cameras/online").header("Authorization",t)).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].id").value(c.toString()));
        mvc.perform(get("/api/cameras").param("status","OFFLINE").header("Authorization",t)).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/cameras").param("search","kids").header("Authorization",t)).andExpect(jsonPath("$.content[0].code").value("CAM-02"));
        mvc.perform(patch("/api/cameras/"+second).header("Authorization",t).contentType(MediaType.APPLICATION_JSON).content("{\"monitoringEnabled\":true}")).andExpect(status().isOk());
        assertEquals(1,sql.queryForObject("SELECT count(*) FROM audit_logs WHERE action='ENABLE_MONITORING' AND entity_id=?",Integer.class,second));
        mvc.perform(patch("/api/cameras/"+second+"/status").header("Authorization",t).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DISABLED\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.monitoringEnabled").value(false));
        assertEquals(1,sql.queryForObject("SELECT count(*) FROM audit_logs WHERE action='DISABLE_MONITORING' AND entity_id=?",Integer.class,second));
        mvc.perform(patch("/api/cameras/"+second+"/monitoring").header("Authorization",t).contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":true}")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CAMERA_DISABLED"));
        mvc.perform(delete("/api/cameras/"+second).header("Authorization",t)).andExpect(status().isNoContent());
        mvc.perform(get("/api/cameras/"+second).header("Authorization",t)).andExpect(status().isNotFound());
    }
    @Test void detectionRejectsUnknownOrDisabledCameraFutureTimeAndWrongKey()throws Exception{
        var c=camera();
        mvc.perform(post("/api/detection-events").header("X-AI-SERVICE-KEY","wrong-key").contentType(MediaType.APPLICATION_JSON).content(detection(c))).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_SERVICE_KEY"));
        mvc.perform(post("/api/detection-events").header("X-AI-SERVICE-KEY",KEY).contentType(MediaType.APPLICATION_JSON).content(detection(UUID.randomUUID()))).andExpect(status().isNotFound());
        String future=json.writeValueAsString(Map.of("cameraId",c,"eventType","DROWNING","confidence",0.9,"detectedAt",Instant.now().plusSeconds(600).toString()));
        mvc.perform(post("/api/detection-events").header("X-AI-SERVICE-KEY",KEY).contentType(MediaType.APPLICATION_JSON).content(future)).andExpect(status().isBadRequest());
        String skew=json.writeValueAsString(Map.of("cameraId",c,"eventType","FALL","confidence",0.9,"detectedAt",Instant.now().plusSeconds(20).toString()));
        mvc.perform(post("/api/detection-events").header("X-AI-SERVICE-KEY",KEY).contentType(MediaType.APPLICATION_JSON).content(skew)).andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("NEW"));
        mvc.perform(patch("/api/cameras/"+c+"/status").header("Authorization","Bearer "+adminToken).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DISABLED\"}")).andExpect(status().isOk());
        mvc.perform(post("/api/detection-events").header("X-AI-SERVICE-KEY",KEY).contentType(MediaType.APPLICATION_JSON).content(detection(c))).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CAMERA_NOT_MONITORED"));
    }
    // ---- Dashboard, notifications, audit -----------------------------------------------------
    @Test void dashboardReportAndStatisticsReflectHandledIncidents()throws Exception{
        var c=camera();var a=incident(c);var b=incident(c);incident(c);
        incidents.transition(staff,a,IncidentStatus.ACKNOWLEDGED,null);incidents.transition(staff,a,IncidentStatus.RESOLVED,"ok");incidents.transition(staff,b,IncidentStatus.FALSE_ALARM,"no");
        String t="Bearer "+adminToken;
        mvc.perform(get("/api/dashboard/report").param("days","7").header("Authorization",t)).andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(3)).andExpect(jsonPath("$.resolved").value(1)).andExpect(jsonPath("$.falseAlarms").value(1)).andExpect(jsonPath("$.active").value(1))
            .andExpect(jsonPath("$.averageResponseSeconds").isNumber()).andExpect(jsonPath("$.averageResolutionSeconds").isNumber()).andExpect(jsonPath("$.averageHandlingSeconds").isNumber());
        mvc.perform(get("/api/dashboard/incident-statistics").param("days","7").header("Authorization",t)).andExpect(jsonPath("$.length()").value(7)).andExpect(jsonPath("$[6].total").value(3)).andExpect(jsonPath("$[0].total").value(0));
        mvc.perform(get("/api/dashboard/camera-statistics").header("Authorization",t)).andExpect(jsonPath("$[0].incidents").value(3)).andExpect(jsonPath("$[0].resolved").value(1)).andExpect(jsonPath("$[0].falseAlarms").value(1)).andExpect(jsonPath("$[0].active").value(1));
        sql.update("UPDATE incidents SET created_at=now()-interval '3 days' WHERE id=?",incident(c));
        mvc.perform(get("/api/dashboard/camera-statistics").param("days","1").header("Authorization",t)).andExpect(jsonPath("$[0].incidents").value(3)).andExpect(jsonPath("$[0].active").value(2));
        mvc.perform(get("/api/dashboard/recent-incidents").param("size","2").header("Authorization",t)).andExpect(jsonPath("$.content.length()").value(2));
        mvc.perform(get("/api/dashboard/recent-incidents").param("size","500").header("Authorization",t)).andExpect(status().isBadRequest());
    }
    @Test void singleReadUpdatesUnreadCountAndPaginationWorks()throws Exception{
        var c=camera();incident(c);incident(c);String t="Bearer "+staffToken;
        mvc.perform(get("/api/notifications").param("size","1").header("Authorization",t)).andExpect(jsonPath("$.content.length()").value(1)).andExpect(jsonPath("$.totalElements").value(2));
        String id=sql.queryForObject("SELECT id::text FROM notifications WHERE user_id=? LIMIT 1",String.class,staff.getId());
        mvc.perform(patch("/api/notifications/"+id+"/read").header("Authorization",t)).andExpect(status().isOk()).andExpect(jsonPath("$.read").value(true));
        mvc.perform(get("/api/notifications/unread-count").header("Authorization",t)).andExpect(jsonPath("$.count").value(1));
    }
    @Test void auditLogsAreWrittenAndFilterable()throws Exception{
        var c=camera();var id=incident(c);incidents.transition(staff,id,IncidentStatus.ACKNOWLEDGED,null);String t="Bearer "+adminToken;
        mvc.perform(get("/api/audit-logs").param("action","CREATE_CAMERA").header("Authorization",t)).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].username").value("admin")).andExpect(jsonPath("$.content[0].entityId").value(c.toString()));
        mvc.perform(get("/api/audit-logs").param("userId",staff.getId().toString()).param("entityType","INCIDENT").header("Authorization",t)).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].action").value("ACKNOWLEDGE_INCIDENT"));
        mvc.perform(get("/api/audit-logs").param("action","LOGIN").header("Authorization",t)).andExpect(jsonPath("$.totalElements").value(3));
    }
    @AfterAll static void stop()throws Exception{PG.close();}
}
