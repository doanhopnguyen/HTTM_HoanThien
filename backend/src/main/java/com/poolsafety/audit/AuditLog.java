package com.poolsafety.audit;
import com.poolsafety.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.*;
import java.math.BigDecimal;
@Getter @Setter @Entity @Table(name="audit_logs")
public class AuditLog extends BaseEntity {
private UUID userId;
@Column(nullable=false) private String action;
@Column(nullable=false) private String entityType;
private UUID entityId;
@Column(columnDefinition="text") private String description;
}
