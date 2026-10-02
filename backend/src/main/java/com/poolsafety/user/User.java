package com.poolsafety.user;
import com.poolsafety.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.*;
import java.math.BigDecimal;
@Getter @Setter @Entity @Table(name="users")
public class User extends BaseEntity {
@Column(nullable=false,unique=true,length=100) private String username;
@Column(nullable=false,unique=true) private String email;
@Column(nullable=false) private String passwordHash;
@Column(nullable=false,length=150) private String fullName;
@Enumerated(EnumType.STRING) @Column(nullable=false,length=30) private Role role;
@Enumerated(EnumType.STRING) @Column(nullable=false,length=30) private UserStatus status = UserStatus.ACTIVE;
@Column(nullable=false) private int authVersion;
@Column(nullable=false) private Instant updatedAt = Instant.now();
}
