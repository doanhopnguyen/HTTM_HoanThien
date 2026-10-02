package com.poolsafety.incident;

import com.poolsafety.camera.*;
import com.poolsafety.detection.*;
import com.poolsafety.user.*;
import com.poolsafety.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.data.domain.Page;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component @RequiredArgsConstructor
public class IncidentMapper {
    private final DetectionEventRepository detections;private final CameraRepository cameras;private final UserRepository users;
    public IncidentDto.Response one(Incident i){return responses(List.of(i)).get(i.getId());}
    public Page<IncidentDto.Response> page(Page<Incident> page){var mapped=responses(page.getContent());return page.map(i->mapped.get(i.getId()));}
    private Map<UUID,IncidentDto.Response> responses(List<Incident> incidents) {
        var ds=detections.findAllById(incidents.stream().map(Incident::getDetectionEventId).toList()).stream().collect(Collectors.toMap(DetectionEvent::getId,Function.identity()));
        var cs=cameras.findAllById(ds.values().stream().map(DetectionEvent::getCameraId).distinct().toList()).stream().collect(Collectors.toMap(Camera::getId,Function.identity()));
        var us=users.findAllById(incidents.stream().map(Incident::getHandledBy).filter(Objects::nonNull).distinct().toList()).stream().collect(Collectors.toMap(User::getId,Function.identity()));
        var result=new HashMap<UUID,IncidentDto.Response>();
        for(var i:incidents){var d=ds.get(i.getDetectionEventId());var c=cs.get(d.getCameraId());var u=us.get(i.getHandledBy());result.put(i.getId(),new IncidentDto.Response(i.getId(),DetectionDto.Response.of(d),CameraDto.Response.of(c),i.getStatus(),u==null?null:UserDto.Response.of(u),i.getAcknowledgedAt(),i.getStartedAt(),i.getResolvedAt(),i.getResolutionNote(),i.getCreatedAt(),i.getUpdatedAt()));}
        return result;
    }
    public Page<IncidentDto.History> history(Page<IncidentHistory> page) {
        var us=users.findAllById(page.stream().map(IncidentHistory::getPerformedBy).filter(Objects::nonNull).distinct().toList()).stream().collect(Collectors.toMap(User::getId,Function.identity()));
        return page.map(h->{var u=us.get(h.getPerformedBy());return new IncidentDto.History(h.getId(),h.getAction(),h.getFromStatus(),h.getToStatus(),u==null?null:UserDto.Response.of(u),h.getNote(),h.getCreatedAt());});
    }
}
