package com.poolsafety.audit;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import java.util.UUID;
import java.time.Instant;

@RestController @RequestMapping("/api/audit-logs") @PreAuthorize("hasRole('ADMIN')") @RequiredArgsConstructor
public class AuditController {
    private final AuditService audit;
    public record Response(UUID id,UUID userId,String username,String userFullName,String action,String entityType,UUID entityId,String description,Instant createdAt) {}
    @GetMapping Page<Response> list(@RequestParam(required=false) String action,@RequestParam(required=false) UUID userId,@RequestParam(required=false) String entityType,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant from,@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant to,
        @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return audit.list(action,userId,entityType,from,to,page,size);}
}
