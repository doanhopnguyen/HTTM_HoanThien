package com.poolsafety.incident;

import com.poolsafety.common.*;
import com.poolsafety.audit.AuditService;
import com.poolsafety.detection.DetectionEvent;
import com.poolsafety.camera.Camera;
import com.poolsafety.notification.NotificationService;
import com.poolsafety.user.*;
import com.poolsafety.websocket.RealtimeEvent;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.*;

@Service
public class IncidentService {
    private final IncidentRepository incidents;private final IncidentHistoryRepository history;private final IncidentMapper mapper;
    private final UserRepository users;private final AuditService audit;private final NotificationService notifications;private final ApplicationEventPublisher events;private final boolean staffFalseAlarm;
    public IncidentService(IncidentRepository incidents,IncidentHistoryRepository history,IncidentMapper mapper,UserRepository users,AuditService audit,NotificationService notifications,ApplicationEventPublisher events,@Value("${app.staff-false-alarm}") boolean staffFalseAlarm){this.incidents=incidents;this.history=history;this.mapper=mapper;this.users=users;this.audit=audit;this.notifications=notifications;this.events=events;this.staffFalseAlarm=staffFalseAlarm;}
    @Transactional(readOnly=true) public IncidentDto.Response get(UUID id){return mapper.one(incidents.findById(id).orElseThrow(()->ApiException.missing("Incident")));}
    @Transactional(readOnly=true) public Page<IncidentDto.Response> list(Collection<IncidentStatus> statuses,UUID cameraId,UUID handledBy,Instant from,Instant to,String search,int page,int size) {
        if(from!=null&&to!=null&&from.isAfter(to))throw new ApiException(400,"INVALID_DATE_RANGE","from must be before to");
        Specification<Incident> spec=(root,q,b)->{
            var p=new ArrayList<Predicate>();
            if(statuses!=null&&!statuses.isEmpty())p.add(root.get("status").in(statuses));if(handledBy!=null)p.add(b.equal(root.get("handledBy"),handledBy));
            if(from!=null)p.add(b.greaterThanOrEqualTo(root.get("createdAt"),from));if(to!=null)p.add(b.lessThanOrEqualTo(root.get("createdAt"),to));
            if(cameraId!=null || (search!=null&&!search.isBlank())) {
                var sub=q.subquery(UUID.class);var d=sub.from(DetectionEvent.class);var c=sub.from(Camera.class);var filters=new ArrayList<Predicate>();
                filters.add(b.equal(d.get("cameraId"),c.get("id")));
                if(cameraId!=null)filters.add(b.equal(d.get("cameraId"),cameraId));
                if(search!=null&&!search.isBlank()) {String term=Pages.likeTerm(search);filters.add(b.or(b.like(b.lower(c.get("name")),term,'\\'),b.like(b.lower(c.get("code")),term,'\\'),b.like(b.lower(d.get("eventType")),term,'\\')));}
                sub.select(d.get("id")).where(filters.toArray(Predicate[]::new));p.add(root.get("detectionEventId").in(sub));
            }
            return b.and(p.toArray(Predicate[]::new));
        };
        return mapper.page(incidents.findAll(spec,Pages.of(page,size)));
    }
    @Transactional(readOnly=true) public Page<IncidentDto.History> history(UUID id,int page,int size,boolean ascending){if(!incidents.existsById(id))throw ApiException.missing("Incident");return mapper.history(history.findByIncidentId(id,Pages.of(page,size,ascending?org.springframework.data.domain.Sort.Direction.ASC:org.springframework.data.domain.Sort.Direction.DESC)));}
    @Transactional public IncidentDto.Response transition(User actor,UUID id,IncidentStatus target,String note) {
        // Row lock makes simultaneous acknowledgements serialize in PostgreSQL.
        var i=incidents.lockById(id).orElseThrow(()->ApiException.missing("Incident"));
        boolean foreign=i.getHandledBy()!=null&&!i.getHandledBy().equals(actor.getId());
        // ADMIN may close (never claim or start) an incident another person is handling; it is recorded as an override.
        boolean override=foreign&&actor.getRole()==Role.ADMIN&&(target==IncidentStatus.RESOLVED||target==IncidentStatus.FALSE_ALARM);
        User previous=foreign?users.findById(i.getHandledBy()).orElseThrow():null;
        if(foreign&&!override) {
            if(i.getStatus()==IncidentStatus.RESOLVED||i.getStatus()==IncidentStatus.FALSE_ALARM)IncidentTransitions.validate(i.getStatus(),target);
            throw new ApiException(409,"INCIDENT_ALREADY_ASSIGNED","Incident is already being handled by "+previous.getFullName());
        }
        if(target==IncidentStatus.FALSE_ALARM && actor.getRole()==Role.STAFF && !staffFalseAlarm)throw new ApiException(403,"FALSE_ALARM_NOT_ALLOWED","Only administrators can mark false alarms");
        IncidentTransitions.validate(i.getStatus(),target);
        var before=i.getStatus();var now=Instant.now();i.setStatus(target);i.setUpdatedAt(now);
        if(target==IncidentStatus.ACKNOWLEDGED){i.setHandledBy(actor.getId());i.setAcknowledgedAt(now);}
        if(target==IncidentStatus.IN_PROGRESS)i.setStartedAt(now);
        if(target==IncidentStatus.RESOLVED||target==IncidentStatus.FALSE_ALARM){i.setResolvedAt(now);i.setResolutionNote(note);
            // The person who closes the incident becomes its handler; an override keeps the previous handler in history.
            if(i.getHandledBy()==null||override)i.setHandledBy(actor.getId());}
        String action=switch(target){case ACKNOWLEDGED->"ACKNOWLEDGED";case IN_PROGRESS->"STARTED";case RESOLVED->"RESOLVED";case FALSE_ALARM->"MARKED_FALSE_ALARM";default->throw new IllegalArgumentException();};
        String auditAction=switch(target){case ACKNOWLEDGED->"ACKNOWLEDGE_INCIDENT";case IN_PROGRESS->"START_INCIDENT";case RESOLVED->"RESOLVE_INCIDENT";case FALSE_ALARM->"FALSE_ALARM";default->throw new IllegalArgumentException();};
        if(override) {
            String historyNote="Override of "+previous.getFullName()+(note==null||note.isBlank()?"":": "+note);
            addHistory(i,"ADMIN_OVERRIDE_"+(target==IncidentStatus.RESOLVED?"RESOLVED":"FALSE_ALARM"),before,actor.getId(),historyNote);
            audit.record(actor.getId(),"ADMIN_OVERRIDE","INCIDENT",id,auditAction+" · "+historyNote);
        } else {
            addHistory(i,action,before,actor.getId(),note);
            audit.record(actor.getId(),auditAction,"INCIDENT",id,note);
        }
        var dto=mapper.one(i);
        String type="INCIDENT_"+(target==IncidentStatus.IN_PROGRESS?"STARTED":target.name());
        notifications.alert(id,type,dto.camera().name(),actor.getFullName()+" · "+target);
        if(override)notifications.notifyUser(previous.getId(),id,"INCIDENT_OVERRIDDEN","Incident closed by administrator",actor.getFullName()+" marked "+dto.camera().name()+" as "+target);
        events.publishEvent(RealtimeEvent.all(type,dto));return dto;
    }
    public void addHistory(Incident i,String action,IncidentStatus before,UUID actor,String note) {
        var h=new IncidentHistory();h.setIncidentId(i.getId());h.setAction(action);h.setFromStatus(before==null?null:before.name());h.setToStatus(i.getStatus().name());h.setPerformedBy(actor);h.setNote(note);history.save(h);
    }
}
