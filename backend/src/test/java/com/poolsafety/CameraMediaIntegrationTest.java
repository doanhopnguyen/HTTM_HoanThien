package com.poolsafety;

import com.poolsafety.user.*;
import com.fasterxml.jackson.databind.*;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.nio.file.Path;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class CameraMediaIntegrationTest {
    static final String KEY="camera-media-ai-key-abcdefghijklmnopqrstuvwxyz";
    static final String PASSWORD="Camera-Media-Test-123!";
    static final EmbeddedPostgres PG;
    @TempDir static Path mediaDirectory;
    static {try {PG=EmbeddedPostgres.builder().start();} catch(Exception e) {throw new ExceptionInInitializerError(e);}}
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",()->PG.getJdbcUrl("postgres","postgres"));
        r.add("spring.datasource.username",()->"postgres");r.add("spring.datasource.password",()->"");
        r.add("app.jwt-secret",()->"camera-media-jwt-secret-abcdefghijklmnopqrstuvwxyz");
        r.add("app.ai-service-key",()->KEY);r.add("app.media-directory",()->mediaDirectory.toString());
    }
    @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired JdbcTemplate sql; @Autowired UserRepository users;
    String adminToken,staffToken;
    @BeforeEach void setup() throws Exception {
        sql.execute("TRUNCATE audit_logs,notifications,incident_history,incidents,detection_events,cameras,refresh_tokens,users CASCADE");
        for(var role:Role.values()) {
            var u=new User();u.setUsername(role.name());u.setEmail(role.name()+"@test.local");u.setFullName(role.name());u.setRole(role);u.setPasswordHash(new BCryptPasswordEncoder(4).encode(PASSWORD));users.save(u);
        }
        adminToken=login("ADMIN");staffToken=login("STAFF");
    }
    String login(String name) throws Exception {
        return json.readTree(mvc.perform(post("/api/auth/login").contentType("application/json").content(json.writeValueAsString(Map.of("username",name,"password",PASSWORD))))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("accessToken").asText();
    }
    JsonNode upload(String kind,String name,String token) throws Exception {
        return json.readTree(mvc.perform(multipart("/api/media/"+kind).file(new MockMultipartFile("file",name,"application/octet-stream",new byte[]{0,1,2,3,4,5,6,7})).header("Authorization","Bearer "+token))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }
    JsonNode create(Map<String,Object> extra) throws Exception {
        var body=new HashMap<String,Object>(Map.of("code","CAM-TEST","name","Local test","status","ONLINE","monitoringEnabled",true));body.putAll(extra);
        return json.readTree(mvc.perform(post("/api/cameras").header("Authorization","Bearer "+adminToken).contentType("application/json").content(json.writeValueAsString(body)))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }
    @Test void localVideoPlaysWithRangeAndAiSettingsPersistAcrossUpdates() throws Exception {
        var video=upload("videos","C:\\video.mp4",adminToken);
        var checkpoint=upload("models","weights.pt",adminToken);
        var camera=create(Map.of("streamUrl","local-video:"+video.path("id").asText(),"aiModel","YOLO26N","modelAsset",checkpoint.path("id").asText(),"aiConfidence",0.72));
        assertEquals("LOCAL_VIDEO",camera.path("sourceType").asText());
        String playback=camera.path("streamUrl").asText();
        mvc.perform(get(playback).header("Range","bytes=0-3")).andExpect(status().isPartialContent()).andExpect(header().string("Content-Range","bytes 0-3/8")).andExpect(content().bytes(new byte[]{0,1,2,3}));
        mvc.perform(patch("/api/cameras/"+camera.path("id").asText()).header("Authorization","Bearer "+adminToken).contentType("application/json").content("{\"name\":\"Renamed\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.aiModel").value("YOLO26N")).andExpect(jsonPath("$.aiConfidence").value(0.72)).andExpect(jsonPath("$.streamUrl").value(playback));
        mvc.perform(get("/api/ai/worker/cameras").header("X-AI-SERVICE-KEY",KEY)).andExpect(status().isOk()).andExpect(jsonPath("$[0].localVideo").value(true)).andExpect(jsonPath("$[0].modelPath").exists());
    }
    @Test void uploadAndWorkerConfigurationEnforcePermissions() throws Exception {
        mvc.perform(multipart("/api/media/videos").file(new MockMultipartFile("file","v.mp4","video/mp4",new byte[]{1})).header("Authorization","Bearer "+staffToken)).andExpect(status().isForbidden());
        mvc.perform(multipart("/api/media/videos").file(new MockMultipartFile("file","bad.exe","application/octet-stream",new byte[]{1})).header("Authorization","Bearer "+adminToken)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/ai/worker/cameras").header("Authorization","Bearer "+adminToken)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/ai/worker/cameras").header("X-AI-SERVICE-KEY","wrong")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/ai/worker/status").contentType("application/json").content("{\"cameraId\":\""+UUID.randomUUID()+"\",\"state\":\"RUNNING\",\"frames\":0,\"detections\":0}" )).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/media/models/"+UUID.randomUUID()+".pt")).andExpect(status().isUnauthorized());
    }
    @Test void missingCheckpointAndMissingVideoAreRejectedWithoutPartialUpdates() throws Exception {
        var camera=create(Map.of());String id=camera.path("id").asText();
        mvc.perform(patch("/api/cameras/"+id).header("Authorization","Bearer "+adminToken).contentType("application/json").content("{\"aiModel\":\"ULTRALYTICS\"}" )).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("MODEL_REQUIRED"));
        mvc.perform(get("/api/cameras/"+id).header("Authorization","Bearer "+adminToken)).andExpect(jsonPath("$.aiModel").value("NONE"));
        mvc.perform(patch("/api/cameras/"+id).header("Authorization","Bearer "+adminToken).contentType("application/json").content("{\"streamUrl\":\"local-video:"+UUID.randomUUID()+".mp4\"}" )).andExpect(status().isNotFound());
        mvc.perform(patch("/api/cameras/"+id).header("Authorization","Bearer "+adminToken).contentType("application/json").content("{\"aiConfidence\":0.01}" )).andExpect(status().isBadRequest());
    }
    @Test void pausedAndDisabledCamerasAreRemovedFromWorkerConfiguration() throws Exception {
        var camera=create(Map.of("streamUrl","http://example.test/video.mp4","aiModel","YOLO26N"));
        String id=camera.path("id").asText();
        mvc.perform(get("/api/ai/worker/cameras").header("X-AI-SERVICE-KEY",KEY)).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(patch("/api/cameras/"+id+"/monitoring").header("Authorization","Bearer "+adminToken).contentType("application/json").content("{\"enabled\":false}" )).andExpect(status().isOk());
        mvc.perform(get("/api/ai/worker/cameras").header("X-AI-SERVICE-KEY",KEY)).andExpect(jsonPath("$.length()").value(0));
    }
    @Test void missingUploadedFileDoesNotStopOtherCameras() throws Exception {
        var video=upload("videos","pool.mp4",adminToken);
        var broken=create(Map.of("streamUrl","local-video:"+video.path("id").asText(),"aiModel","YOLO26N"));
        create(Map.of("code","SECOND","streamUrl","http://example.test/live.mp4","aiModel","YOLO26N"));
        java.nio.file.Files.delete(mediaDirectory.resolve("videos").resolve(video.path("id").asText()));
        mvc.perform(get("/api/ai/worker/cameras").header("X-AI-SERVICE-KEY",KEY)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].source").value("http://example.test/live.mp4"));
        mvc.perform(get("/api/ai/status").header("Authorization","Bearer "+adminToken)).andExpect(status().isOk()).andExpect(jsonPath("$[?(@.cameraId == '"+broken.path("id").asText()+"')].state").value(org.hamcrest.Matchers.hasItem("ERROR")));
    }
    @AfterAll static void close() throws Exception {PG.close();}
}
