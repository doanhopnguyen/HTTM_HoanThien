package com.poolsafety.auth;
import com.poolsafety.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.*;
import java.math.BigDecimal;
@Getter @Setter @Entity @Table(name="refresh_tokens")
public class RefreshToken extends BaseEntity {
@Column(nullable=false) private UUID userId;
@Column(nullable=false,unique=true) private String tokenHash;
@Column(nullable=false) private Instant expiresAt;
private Instant revokedAt;
private String deviceName;
}
