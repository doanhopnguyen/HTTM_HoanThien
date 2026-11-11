package com.poolsafety.camera;

import com.poolsafety.common.ApiException;
import com.poolsafety.media.MediaStorage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController @RequestMapping("/api/ai")
public class AiController {
    private final CameraRepository cameras;
    private final MediaStorage media;
    private final byte[] secret;
    private final Map<UUID,RuntimeStatus> statuses = new ConcurrentHashMap<>();
    public AiController(CameraRepository cameras, MediaStorage media,@Value("${app.ai-service-key}") String key) {
        this.cameras=cameras;this.media=media;this.secret=key.getBytes(StandardCharsets.UTF_8);
    }
    private void authorize(String key) {
        if(key==null || !MessageDigest.isEqual(secret,key.getBytes(StandardCharsets.UTF_8)))
            throw new ApiException(401,"INVALID_SERVICE_KEY","AI service authentication required");
    }
    public record WorkerCamera(UUID id,String name,String source,AiModel aiModel,String modelPath,double confidence,boolean localVideo,Instant revision) {}
    @GetMapping("/worker/cameras")
    List<WorkerCamera> configs(@RequestHeader(value="X-AI-SERVICE-KEY",required=false) String key) {
        authorize(key);
        var result=new ArrayList<WorkerCamera>();
        for(var c:cameras.findAll()) {
            if(c.getStatus()!=CameraStatus.ONLINE || !c.isMonitoringEnabled() || c.getAiModel()==AiModel.NONE || c.getStreamUrl()==null || c.getStreamUrl().isBlank())continue;
            try {
                boolean local=c.getStreamUrl().startsWith("local-video:");
                result.add(new WorkerCamera(c.getId(),c.getName(),local?media.path("videos",c.getStreamUrl().substring(12)).toString():c.getStreamUrl(),c.getAiModel(),c.getModelAsset()==null?null:media.path("models",c.getModelAsset()).toString(),c.getAiConfidence(),local,c.getUpdatedAt()));
            } catch(ApiException e) {
                statuses.put(c.getId(),new RuntimeStatus(c.getId(),"ERROR","Uploaded video/checkpoint is missing; select the file again",0,0,Instant.now()));
            }
        }
        return result;
    }
    public record Report(@NotNull UUID cameraId,@NotBlank @Pattern(regexp="LOADING|RUNNING|ERROR|STOPPED|FINISHED") String state,@Size(max=500) String message,@Min(0) long frames,@Min(0) long detections) {}
    public record RuntimeStatus(UUID cameraId,String state,String message,long frames,long detections,Instant updatedAt) {}
    @PostMapping("/worker/status")
    void report(@RequestHeader(value="X-AI-SERVICE-KEY",required=false) String key,@Valid @RequestBody Report report) {
        authorize(key);
        if(!cameras.existsById(report.cameraId()))throw ApiException.missing("Camera");
        statuses.put(report.cameraId(),new RuntimeStatus(report.cameraId(),report.state(),report.message(),report.frames(),report.detections(),Instant.now()));
    }
    @GetMapping("/status")
    List<RuntimeStatus> status() {
        Instant cutoff=Instant.now().minusSeconds(20);
        return statuses.values().stream().filter(s->cameras.existsById(s.cameraId())).map(s->s.updatedAt().isBefore(cutoff) && (s.state().equals("RUNNING") || s.state().equals("LOADING"))?new RuntimeStatus(s.cameraId(),"STOPPED","AI worker is offline",s.frames(),s.detections(),s.updatedAt()):s).toList();
    }
}
