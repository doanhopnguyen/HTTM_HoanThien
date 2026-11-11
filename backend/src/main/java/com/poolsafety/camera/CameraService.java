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
import java.util.*;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;

@Service @RequiredArgsConstructor
public class CameraService {
    private final com.poolsafety.media.MediaStorage media;
    private final CameraRepository cameras;private final DetectionEventRepository detections;private final AuditService audit;private final ApplicationEventPublisher events;private final NotificationService notifications;
    @Transactional(readOnly=true) public Page<CameraDto.Response> list(CameraStatus status,String search,int page,int size) {
        Specification<Camera> spec=(root,q,b)->{
            var p=new ArrayList<Predicate>();
            if(status!=null)p.add(b.equal(root.get("status"),status));
            if(search!=null&&!search.isBlank()){String term=Pages.likeTerm(search);
                p.add(b.or(b.like(b.lower(root.get("code")),term,'\\'),b.like(b.lower(root.get("name")),term,'\\'),b.like(b.lower(root.get("locationDescription")),term,'\\')));}
            return b.and(p.toArray(Predicate[]::new));
        };
        return cameras.findAll(spec,Pages.of(page,size)).map(CameraDto.Response::of);
    }
    public Camera get(UUID id){return cameras.findById(id).orElseThrow(()->ApiException.missing("Camera"));}
    @Transactional public CameraDto.Response create(User actor,CameraDto.Create r) {
        MediaUrls.validate(r.streamUrl(),true);
        validateVideo(r.streamUrl());
        var c=new Camera();c.setCode(r.code());c.setName(r.name());c.setLocationDescription(r.locationDescription());c.setStreamUrl(r.streamUrl());c.setStatus(r.status());c.setMonitoringEnabled(r.monitoringEnabled()&&r.status()!=CameraStatus.DISABLED);cameras.saveAndFlush(c);
        configureAi(c,r.aiModel(),r.modelAsset(),r.aiConfidence());
        return changed(actor,c,"CREATE_CAMERA");
    }
    @Transactional public CameraDto.Response update(User actor,UUID id,CameraDto.Update r) {
        var c=get(id);var before=c.getStatus();var monitoredBefore=c.isMonitoringEnabled();MediaUrls.validate(r.streamUrl(),true);
        validateVideo(r.streamUrl());
        configureAi(c,r.aiModel(),r.modelAsset(),r.aiConfidence());
        if(r.code()!=null)c.setCode(r.code());if(r.name()!=null)c.setName(r.name());if(r.locationDescription()!=null)c.setLocationDescription(r.locationDescription());if(r.streamUrl()!=null)c.setStreamUrl(r.streamUrl().isBlank()?null:r.streamUrl());
        if(r.status()!=null)c.setStatus(r.status());if(r.monitoringEnabled()!=null)c.setMonitoringEnabled(r.monitoringEnabled());
        if(c.getStatus()==CameraStatus.DISABLED)c.setMonitoringEnabled(false);c.setUpdatedAt(Instant.now());cameras.flush();offlineNotice(c,before);
        if(monitoredBefore!=c.isMonitoringEnabled())audit.record(actor.getId(),c.isMonitoringEnabled()?"ENABLE_MONITORING":"DISABLE_MONITORING","CAMERA",c.getId(),c.getName());
        return changed(actor,c,"UPDATE_CAMERA");
    }
    @Transactional public CameraDto.Response monitoring(User actor,UUID id,boolean enabled) {
        var c=get(id);if(enabled&&c.getStatus()==CameraStatus.DISABLED)throw new ApiException(400,"CAMERA_DISABLED","Disabled camera cannot be monitored");
        c.setMonitoringEnabled(enabled);c.setUpdatedAt(Instant.now());return changed(actor,c,enabled?"ENABLE_MONITORING":"DISABLE_MONITORING");
    }
    @Transactional public CameraDto.Response status(User actor,UUID id,CameraStatus status) {
        var c=get(id);var before=c.getStatus();c.setStatus(status);if(status==CameraStatus.DISABLED)stopMonitoring(actor,c);c.setUpdatedAt(Instant.now());offlineNotice(c,before);return changed(actor,c,"UPDATE_CAMERA");
    }
    @Transactional public void delete(User actor,UUID id) {
        var c=get(id);
        if(detections.existsByCameraId(id)){c.setStatus(CameraStatus.DISABLED);stopMonitoring(actor,c);c.setUpdatedAt(Instant.now());changed(actor,c,"DISABLE_CAMERA");}
        else{cameras.delete(c);audit.record(actor.getId(),"DELETE_CAMERA","CAMERA",id,c.getName());events.publishEvent(RealtimeEvent.all("CAMERA_DELETED",java.util.Map.of("id",id)));}
    }
    private void validateVideo(String source) {
        if(source!=null && source.startsWith("local-video:"))media.path("videos",source.substring(12));
    }
    private void configureAi(Camera c,AiModel model,String asset,Double confidence) {
        if(model!=null)c.setAiModel(model);
        if(asset!=null)c.setModelAsset(asset.isBlank()?null:asset);
        if(confidence!=null)c.setAiConfidence(confidence);
        if(c.getAiModel()==AiModel.NONE)c.setModelAsset(null);
        if(c.getModelAsset()!=null)media.path("models",c.getModelAsset());
        if((c.getAiModel()==AiModel.ULTRALYTICS || c.getAiModel()==AiModel.REFERENCE) && c.getModelAsset()==null)
            throw new ApiException(400,"MODEL_REQUIRED","Choose a checkpoint for this AI model");
    }
    private CameraDto.Response changed(User actor,Camera c,String action){audit.record(actor.getId(),action,"CAMERA",c.getId(),c.getName());var response=CameraDto.Response.of(c);events.publishEvent(RealtimeEvent.all("CAMERA_STATUS_CHANGED",response));return response;}
    /** Turns monitoring off as a side effect of disabling, audited like an explicit DISABLE_MONITORING. */
    private void stopMonitoring(User actor,Camera c){if(c.isMonitoringEnabled()){c.setMonitoringEnabled(false);audit.record(actor.getId(),"DISABLE_MONITORING","CAMERA",c.getId(),c.getName());}}
    private void offlineNotice(Camera c,CameraStatus before){if(before!=CameraStatus.OFFLINE&&c.getStatus()==CameraStatus.OFFLINE)notifications.alert(null,"CAMERA_OFFLINE","Camera offline",c.getName()+" is offline");}
}
