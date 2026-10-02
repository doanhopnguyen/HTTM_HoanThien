package com.poolsafety.notification;

import com.poolsafety.common.ApiException;
import com.poolsafety.user.*;
import com.poolsafety.websocket.RealtimeEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;
import java.util.UUID;
import java.time.Instant;

@Service @RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notifications;private final UserRepository users;private final ApplicationEventPublisher events;
    public void alert(UUID incident,String type,String title,String message) {
        for(var user:users.findByStatus(UserStatus.ACTIVE)) {
            var n=new Notification();n.setUserId(user.getId());n.setIncidentId(incident);n.setType(type);n.setTitle(title);n.setMessage(message);notifications.save(n);
            events.publishEvent(RealtimeEvent.user("NOTIFICATION_CREATED",NotificationDto.of(n),user.getId()));
        }
    }
    @Transactional public NotificationDto read(UUID actor,UUID id) {
        var n=notifications.findByIdAndUserId(id,actor).orElseThrow(()->ApiException.missing("Notification"));
        if(!n.isRead()){n.setRead(true);n.setReadAt(Instant.now());}var dto=NotificationDto.of(n);events.publishEvent(RealtimeEvent.user("NOTIFICATION_READ",dto,actor));return dto;
    }
    @Transactional public void readAll(UUID actor){notifications.readAll(actor,Instant.now());events.publishEvent(RealtimeEvent.user("NOTIFICATIONS_READ_ALL",java.util.Map.of(),actor));}
}
