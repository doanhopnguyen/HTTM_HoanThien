package com.poolsafety.incident;
import com.poolsafety.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.*;
import java.math.BigDecimal;
@Getter @Setter @Entity @Table(name="incidents")
public class Incident extends BaseEntity {
@Column(nullable=false,unique=true) private UUID detectionEventId;
@Enumerated(EnumType.STRING) @Column(nullable=false) private IncidentStatus status = IncidentStatus.NEW;
private UUID handledBy;
private Instant acknowledgedAt;
private Instant startedAt;
private Instant resolvedAt;
@Column(columnDefinition="text") private String resolutionNote;
@Column(nullable=false) private Instant updatedAt = Instant.now();
}
