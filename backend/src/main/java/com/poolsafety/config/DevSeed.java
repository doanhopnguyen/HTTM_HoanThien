package com.poolsafety.config;

import com.poolsafety.user.*;
import com.poolsafety.camera.*;
import com.poolsafety.detection.*;
import com.poolsafety.incident.*;
import com.poolsafety.notification.*;
import com.poolsafety.auth.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.math.BigDecimal;
import java.util.*;

@Component @Profile("dev")
public class DevSeed implements ApplicationRunner {
    private final UserRepository users;private final CameraRepository cameras;private final DetectionEventRepository detections;private final IncidentRepository incidents;private final IncidentHistoryRepository history;private final NotificationRepository notifications;private final PasswordEncoder passwords;private final String password;
    public DevSeed(UserRepository users,CameraRepository cameras,DetectionEventRepository detections,IncidentRepository incidents,IncidentHistoryRepository history,NotificationRepository notifications,PasswordEncoder passwords,@Value("${app.dev-password}") String password){this.users=users;this.cameras=cameras;this.detections=detections;this.incidents=incidents;this.history=history;this.notifications=notifications;this.passwords=passwords;this.password=password;}
    @Override @Transactional public void run(ApplicationArguments args) {
        if(password.length()<10)throw new IllegalArgumentException("DEV_PASSWORD requires at least 10 characters");AuthService.checkPassword(password);
        String hash=passwords.encode(password);var staff=new ArrayList<User>();
        for(int n=0;n<4;n++){String username=n==0?"admin":"staff"+n;var existing=users.findByUsername(username);User u;
            if(existing.isPresent())u=existing.get();else{u=new User();u.setUsername(username);u.setEmail(username+"@poolsafety.local");u.setFullName(n==0?"Pool Administrator":"Lifeguard "+n);u.setRole(n==0?Role.ADMIN:Role.STAFF);u.setPasswordHash(hash);users.save(u);}staff.add(u);}
        if(cameras.count()>0)return;
        var cs=new ArrayList<Camera>();String[] locations={"Deep water · North","Shallow water · East","Children area","Pool entrance","West lane","South corner"};
        for(int n=0;n<6;n++){var c=new Camera();c.setCode("CAM-0"+(n+1));c.setName("Camera "+(n+1));c.setLocationDescription(locations[n]);c.setStatus(n==5?CameraStatus.OFFLINE:CameraStatus.ONLINE);c.setMonitoringEnabled(true);cameras.save(c);cs.add(c);}
        for(int n=0;n<10;n++){
            var d=new DetectionEvent();d.setCameraId(cs.get(n%6).getId());d.setEventType("DROWNING");d.setConfidence(new BigDecimal("0.94000"));d.setDetectedAt(Instant.now().minusSeconds(n*7200L));d.setCreatedAt(d.getDetectedAt());d.setMetadata(Map.of("developmentSeed",true));detections.save(d);
            var i=new Incident();i.setDetectionEventId(d.getId());i.setCreatedAt(d.getDetectedAt());i.setUpdatedAt(d.getDetectedAt());incidents.save(i);
            seedHistory(i,"DETECTED",null,"NEW",null,d.getDetectedAt());
            if(n>=2){var actor=staff.get(1+n%3);i.setHandledBy(actor.getId());i.setAcknowledgedAt(d.getDetectedAt().plusSeconds(30));seedHistory(i,"ACKNOWLEDGED","NEW","ACKNOWLEDGED",actor.getId(),i.getAcknowledgedAt());
                if(n==2){i.setStatus(IncidentStatus.IN_PROGRESS);i.setStartedAt(d.getDetectedAt().plusSeconds(60));seedHistory(i,"STARTED","ACKNOWLEDGED","IN_PROGRESS",actor.getId(),i.getStartedAt());}
                else{i.setStatus(n%3==0?IncidentStatus.FALSE_ALARM:IncidentStatus.RESOLVED);i.setResolvedAt(d.getDetectedAt().plusSeconds(300));i.setResolutionNote("Development sample");seedHistory(i,i.getStatus()==IncidentStatus.RESOLVED?"RESOLVED":"MARKED_FALSE_ALARM","ACKNOWLEDGED",i.getStatus().name(),actor.getId(),i.getResolvedAt());}}
            for(var u:staff){var notification=new Notification();notification.setUserId(u.getId());notification.setIncidentId(i.getId());notification.setType("INCIDENT_CREATED");notification.setTitle("Drowning alert");notification.setMessage(cs.get(n%6).getName());notifications.save(notification);}
        }
    }
    private void seedHistory(Incident i,String action,String from,String to,UUID actor,Instant time){var h=new IncidentHistory();h.setIncidentId(i.getId());h.setAction(action);h.setFromStatus(from);h.setToStatus(to);h.setPerformedBy(actor);h.setCreatedAt(time);history.save(h);}
}
