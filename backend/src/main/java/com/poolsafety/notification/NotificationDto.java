package com.poolsafety.notification;

import java.util.UUID;
import java.time.Instant;

public record NotificationDto(UUID id,UUID incidentId,String type,String title,String message,boolean read,Instant readAt,Instant createdAt) {
    public static NotificationDto of(Notification n){return new NotificationDto(n.getId(),n.getIncidentId(),n.getType(),n.getTitle(),n.getMessage(),n.isRead(),n.getReadAt(),n.getCreatedAt());}
}
