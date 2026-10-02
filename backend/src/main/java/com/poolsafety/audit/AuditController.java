package com.poolsafety.audit;

import com.poolsafety.common.Pages;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import java.util.UUID;
import java.time.Instant;

@RestController @RequestMapping("/api/audit-logs") @RequiredArgsConstructor
public class AuditController {
    private final AuditLogRepository logs;
    public record Response(UUID id,UUID userId,String action,String entityType,UUID entityId,String description,Instant createdAt) {}
    @GetMapping Page<Response> list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return logs.findAll(Pages.of(page,size)).map(a->new Response(a.getId(),a.getUserId(),a.getAction(),a.getEntityType(),a.getEntityId(),a.getDescription(),a.getCreatedAt()));}
}
