package com.poolsafety.camera;

import com.poolsafety.common.*;
import com.poolsafety.audit.AuditService;
import com.poolsafety.detection.DetectionEventRepository;
import com.poolsafety.user.User;
import com.poolsafety.notification.NotificationService;
import com.poolsafety.websocket.RealtimeEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class CameraService {
    private final CameraRepository cameras;private final DetectionEventRepository detections;private final AuditService audit;private final ApplicationEventPublisher events;private final NotificationService notifications;
    public Camera get(UUID id){return cameras.findById(id).orElseThrow(()->ApiException.missing("Camera"));}
    @Transactional public CameraDto.Response create(User actor,CameraDto.Create r) {
        MediaUrls.validate(r.streamUrl(),true);
        var c=new Camera();c.setCode(r.code());c.setName(r.name());c.setLocationDescription(r.locationDescription());c.setStreamUrl(r.streamUrl());c.setStatus(r.status());c.setMonitoringEnabled(r.monitoringEnabled()&&r.status()!=CameraStatus.DISABLED);cameras.saveAndFlush(c);
        return changed(actor,c,"CREATE_CAMERA");
    }
    @Transactional public CameraDto.Response update(User actor,UUID id,CameraDto.Update r) {
        var c=get(id);var before=c.getStatus();MediaUrls.validate(r.streamUrl(),true);
        if(r.code()!=null)c.setCode(r.code());if(r.name()!=null)c.setName(r.name());if(r.locationDescription()!=null)c.setLocationDescription(r.locationDescription());if(r.streamUrl()!=null)c.setStreamUrl(r.streamUrl());
        if(r.status()!=null)c.setStatus(r.status());if(r.monitoringEnabled()!=null)c.setMonitoringEnabled(r.monitoringEnabled());
        if(c.getStatus()==CameraStatus.DISABLED)c.setMonitoringEnabled(false);c.setUpdatedAt(Instant.now());cameras.flush();offlineNotice(c,before);return changed(actor,c,"UPDATE_CAMERA");
    }
    @Transactional public CameraDto.Response monitoring(User actor,UUID id,boolean enabled) {
        var c=get(id);if(enabled&&c.getStatus()==CameraStatus.DISABLED)throw new ApiException(400,"CAMERA_DISABLED","Disabled camera cannot be monitored");
        c.setMonitoringEnabled(enabled);c.setUpdatedAt(Instant.now());return changed(actor,c,enabled?"ENABLE_MONITORING":"DISABLE_MONITORING");
    }
    @Transactional public CameraDto.Response status(User actor,UUID id,CameraStatus status) {
        var c=get(id);var before=c.getStatus();c.setStatus(status);if(status==CameraStatus.DISABLED)c.setMonitoringEnabled(false);c.setUpdatedAt(Instant.now());offlineNotice(c,before);return changed(actor,c,"UPDATE_CAMERA");
    }
    @Transactional public void delete(User actor,UUID id) {
        var c=get(id);
        if(detections.existsByCameraId(id)){c.setStatus(CameraStatus.DISABLED);c.setMonitoringEnabled(false);c.setUpdatedAt(Instant.now());changed(actor,c,"DISABLE_CAMERA");}
        else{cameras.delete(c);audit.record(actor.getId(),"DELETE_CAMERA","CAMERA",id,c.getName());events.publishEvent(RealtimeEvent.all("CAMERA_DELETED",java.util.Map.of("id",id)));}
    }
    private CameraDto.Response changed(User actor,Camera c,String action){audit.record(actor.getId(),action,"CAMERA",c.getId(),c.getName());var response=CameraDto.Response.of(c);events.publishEvent(RealtimeEvent.all("CAMERA_STATUS_CHANGED",response));return response;}
    private void offlineNotice(Camera c,CameraStatus before){if(before!=CameraStatus.OFFLINE&&c.getStatus()==CameraStatus.OFFLINE)notifications.alert(null,"CAMERA_OFFLINE","Camera offline",c.getName()+" is offline");}
}
