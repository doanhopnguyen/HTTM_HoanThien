package com.poolsafety.incident;
import com.poolsafety.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.*;
import java.math.BigDecimal;
@Getter @Setter @Entity @Table(name="incident_history")
public class IncidentHistory extends BaseEntity {
@Column(nullable=false) private UUID incidentId;
@Column(nullable=false) private String action;
private String fromStatus;
private String toStatus;
private UUID performedBy;
@Column(columnDefinition="text") private String note;
}
