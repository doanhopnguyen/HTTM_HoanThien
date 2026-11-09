package com.poolsafety.incident;

import com.poolsafety.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/incidents") @RequiredArgsConstructor
public class IncidentController {
    private final IncidentService service;private final CurrentUser current;
    @GetMapping Page<IncidentDto.Response> list(@RequestParam(required=false) List<IncidentStatus> status,@RequestParam(required=false) UUID cameraId,@RequestParam(required=false) UUID handledBy,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant from,@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant to,
        @RequestParam(required=false) String search,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.list(status,cameraId,handledBy,from,to,search,page,size);}
    @GetMapping("/{id}") IncidentDto.Response get(@PathVariable UUID id){return service.get(id);}
    @GetMapping("/{id}/history") Page<IncidentDto.History> history(@PathVariable UUID id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="asc") String order){return service.history(id,page,size,!"desc".equalsIgnoreCase(order));}
    @PatchMapping("/{id}/acknowledge") IncidentDto.Response ack(@PathVariable UUID id){return service.transition(current.get(),id,IncidentStatus.ACKNOWLEDGED,null);}
    @PatchMapping("/{id}/start") IncidentDto.Response start(@PathVariable UUID id){return service.transition(current.get(),id,IncidentStatus.IN_PROGRESS,null);}
    @PatchMapping("/{id}/resolve") IncidentDto.Response resolve(@PathVariable UUID id,@Valid @RequestBody IncidentDto.Note note){return service.transition(current.get(),id,IncidentStatus.RESOLVED,note.note());}
    @PatchMapping("/{id}/false-alarm") IncidentDto.Response falseAlarm(@PathVariable UUID id,@Valid @RequestBody IncidentDto.Note note){return service.transition(current.get(),id,IncidentStatus.FALSE_ALARM,note.note());}
}
