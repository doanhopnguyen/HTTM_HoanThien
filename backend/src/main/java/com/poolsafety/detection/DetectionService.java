package com.poolsafety.detection;

import com.poolsafety.camera.*;
import com.poolsafety.common.*;
import com.poolsafety.incident.*;
import com.poolsafety.notification.NotificationService;
import com.poolsafety.websocket.RealtimeEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class DetectionService {
    private final CameraService cameras;private final DetectionEventRepository detections;private final IncidentRepository incidents;
    private final IncidentService incidentService;private final IncidentMapper mapper;private final NotificationService notifications;private final ApplicationEventPublisher events;
    @Transactional public DetectionDto.Created create(DetectionDto.Create r) {
        var c=cameras.get(r.cameraId());
        if(c.getStatus()==CameraStatus.DISABLED || !c.isMonitoringEnabled())throw new ApiException(409,"CAMERA_NOT_MONITORED","Camera is disabled or monitoring is turned off");
        MediaUrls.validate(r.snapshotUrl(),false);MediaUrls.validate(r.videoUrl(),false);
        var d=new DetectionEvent();d.setCameraId(c.getId());d.setEventType(r.eventType());d.setConfidence(r.confidence());d.setSnapshotUrl(r.snapshotUrl());d.setVideoUrl(r.videoUrl());d.setDetectedAt(r.detectedAt());d.setMetadata(r.metadata());detections.save(d);
        var i=new Incident();i.setDetectionEventId(d.getId());incidents.save(i);incidentService.addHistory(i,"DETECTED",null,null,"Detection received from AI service");
        var dto=mapper.one(i);notifications.alert(i.getId(),"INCIDENT_CREATED",r.eventType()+" ALERT",c.getName()+" · "+c.getLocationDescription());
        events.publishEvent(RealtimeEvent.all("INCIDENT_CREATED",dto));return new DetectionDto.Created(d.getId(),i.getId(),"NEW");
    }
}
