package com.poolsafety.audit;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class AuditService {
    private final AuditLogRepository logs;
    public void record(UUID actor,String action,String entity,UUID id,String description) {
        var log=new AuditLog(); log.setUserId(actor);log.setAction(action);log.setEntityType(entity);log.setEntityId(id);log.setDescription(description);logs.save(log);
    }
}
