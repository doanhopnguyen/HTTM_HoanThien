package com.poolsafety.notification;
import com.poolsafety.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.*;
import java.math.BigDecimal;
@Getter @Setter @Entity @Table(name="notifications")
public class Notification extends BaseEntity {
@Column(nullable=false) private UUID userId;
private UUID incidentId;
@Column(nullable=false) private String type;
@Column(nullable=false) private String title;
@Column(nullable=false,columnDefinition="text") private String message;
@Column(name="is_read",nullable=false) private boolean read;
private Instant readAt;
}
