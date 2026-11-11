package com.poolsafety.camera;

import com.poolsafety.common.MediaUrls;
import jakarta.validation.constraints.*;
import java.util.UUID;
import java.time.Instant;

public final class CameraDto {
    private CameraDto() {}
    public record Create(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{1,100}") String code,@NotBlank @Size(max=255) String name,
                         @Size(max=255) String locationDescription,@Size(max=2048) String streamUrl,@NotNull CameraStatus status,@NotNull Boolean monitoringEnabled,
                         AiModel aiModel,@Size(max=100) String modelAsset,@DecimalMin("0.05") @DecimalMax("1") Double aiConfidence) {}
    public record Update(@Pattern(regexp="[A-Za-z0-9_-]{1,100}") String code,@Size(min=1,max=255) String name,
                         @Size(max=255) String locationDescription,@Size(max=2048) String streamUrl,CameraStatus status,Boolean monitoringEnabled,
                         AiModel aiModel,@Size(max=100) String modelAsset,@DecimalMin("0.05") @DecimalMax("1") Double aiConfidence) {}
    public record Monitoring(@NotNull Boolean enabled) {}
    public record Status(@NotNull CameraStatus status) {}
    public record Response(UUID id,String code,String name,String locationDescription,String streamUrl,String streamUrlMasked,CameraStatus status,boolean monitoringEnabled,Instant createdAt,Instant updatedAt,AiModel aiModel,String modelAsset,double aiConfidence,String sourceType) {
        public static Response of(Camera c){return new Response(c.getId(),c.getCode(),c.getName(),c.getLocationDescription(),MediaUrls.playable(c.getStreamUrl()),MediaUrls.masked(c.getStreamUrl()),c.getStatus(),c.isMonitoringEnabled(),c.getCreatedAt(),c.getUpdatedAt(),c.getAiModel(),c.getModelAsset(),c.getAiConfidence(),c.getStreamUrl()!=null&&c.getStreamUrl().startsWith("local-video:")?"LOCAL_VIDEO":"STREAM");}
    }
}
