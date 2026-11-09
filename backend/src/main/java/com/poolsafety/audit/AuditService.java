package com.poolsafety.audit;

import com.poolsafety.common.*;
import com.poolsafety.user.*;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class AuditService {
    private final AuditLogRepository logs;
    private final UserRepository users;
    public void record(UUID actor,String action,String entity,UUID id,String description) {
        var log=new AuditLog(); log.setUserId(actor);log.setAction(action);log.setEntityType(entity);log.setEntityId(id);log.setDescription(description);logs.save(log);
    }
    @Transactional(readOnly=true)
    public Page<AuditController.Response> list(String action,UUID userId,String entityType,Instant from,Instant to,int page,int size) {
        if(from!=null&&to!=null&&from.isAfter(to))throw new ApiException(400,"INVALID_DATE_RANGE","from must be before to");
        Specification<AuditLog> spec=(root,q,b)->{
            var p=new ArrayList<Predicate>();
            if(action!=null&&!action.isBlank())p.add(b.equal(root.get("action"),action.trim().toUpperCase(Locale.ROOT)));
            if(userId!=null)p.add(b.equal(root.get("userId"),userId));
            if(entityType!=null&&!entityType.isBlank())p.add(b.equal(root.get("entityType"),entityType.trim().toUpperCase(Locale.ROOT)));
            if(from!=null)p.add(b.greaterThanOrEqualTo(root.get("createdAt"),from));
            if(to!=null)p.add(b.lessThanOrEqualTo(root.get("createdAt"),to));
            return b.and(p.toArray(Predicate[]::new));
        };
        var result=logs.findAll(spec,Pages.of(page,size));
        var actors=users.findAllById(result.stream().map(AuditLog::getUserId).filter(Objects::nonNull).distinct().toList()).stream().collect(Collectors.toMap(User::getId,Function.identity()));
        return result.map(a->{var u=actors.get(a.getUserId());return new AuditController.Response(a.getId(),a.getUserId(),u==null?null:u.getUsername(),u==null?null:u.getFullName(),a.getAction(),a.getEntityType(),a.getEntityId(),a.getDescription(),a.getCreatedAt());});
    }
}
