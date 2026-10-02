package com.poolsafety.detection;
import com.poolsafety.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.*;
import java.math.BigDecimal;
@Getter @Setter @Entity @Table(name="detection_events")
public class DetectionEvent extends BaseEntity {
@Column(nullable=false) private UUID cameraId;
@Column(nullable=false,length=80) private String eventType;
@Column(precision=6,scale=5) private BigDecimal confidence;
@Column(length=2048) private String snapshotUrl;
@Column(length=2048) private String videoUrl;
@org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON) @Column(columnDefinition="jsonb") private Map<String,Object> metadata;
@Column(nullable=false) private Instant detectedAt;
}
