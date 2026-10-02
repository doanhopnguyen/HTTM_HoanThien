package com.poolsafety.incident;

import com.poolsafety.camera.CameraDto;
import com.poolsafety.detection.DetectionDto;
import com.poolsafety.user.UserDto;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.UUID;

public final class IncidentDto {
    private IncidentDto() {}
    public record Response(UUID id,DetectionDto.Response detectionEvent,CameraDto.Response camera,IncidentStatus status,UserDto.Response handledBy,
                           Instant acknowledgedAt,Instant startedAt,Instant resolvedAt,String resolutionNote,Instant createdAt,Instant updatedAt) {}
    public record Note(@NotBlank @Size(max=5000) String note) {}
    public record History(UUID id,String action,String fromStatus,String toStatus,UserDto.Response performedBy,String note,Instant createdAt) {}
}
