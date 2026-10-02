package com.poolsafety.detection;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

public final class DetectionDto {
    private DetectionDto() {}
    public record Create(@NotNull UUID cameraId,@NotBlank @Pattern(regexp="[A-Z][A-Z0-9_]{0,79}") String eventType,
                         @DecimalMin("0") @DecimalMax("1") BigDecimal confidence,
                         @Size(max=2048) String snapshotUrl,@Size(max=2048) String videoUrl,@NotNull @PastOrPresent Instant detectedAt,Map<String,Object> metadata) {}
    public record Response(UUID id,UUID cameraId,String eventType,BigDecimal confidence,String snapshotUrl,String videoUrl,Map<String,Object> metadata,Instant detectedAt,Instant createdAt) {
        public static Response of(DetectionEvent e){return new Response(e.getId(),e.getCameraId(),e.getEventType(),e.getConfidence(),e.getSnapshotUrl(),e.getVideoUrl(),e.getMetadata(),e.getDetectedAt(),e.getCreatedAt());}
    }
    public record Created(UUID detectionEventId,UUID incidentId,String status) {}
}
