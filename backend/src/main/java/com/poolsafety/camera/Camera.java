package com.poolsafety.camera;
import com.poolsafety.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.*;
import java.math.BigDecimal;
@Getter @Setter @Entity @Table(name="cameras")
public class Camera extends BaseEntity {
@Column(nullable=false,unique=true) private String code;
@Column(nullable=false) private String name;
private String locationDescription;
@Column(length=2048) private String streamUrl;
@Enumerated(EnumType.STRING) @Column(nullable=false,length=30) private AiModel aiModel = AiModel.NONE;
@Column(length=100) private String modelAsset;
@Column(nullable=false) private double aiConfidence = 0.5;
@Enumerated(EnumType.STRING) @Column(nullable=false) private CameraStatus status = CameraStatus.OFFLINE;
@Column(nullable=false) private boolean monitoringEnabled;
@Column(nullable=false) private Instant updatedAt = Instant.now();
}
