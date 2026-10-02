package com.poolsafety.common;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.UUID;

@Getter @Setter @MappedSuperclass
public abstract class BaseEntity implements org.springframework.data.domain.Persistable<UUID> {
    @Id protected UUID id = UUID.randomUUID();
    @Column(nullable = false, updatable = false) protected Instant createdAt = Instant.now();
    @Transient private boolean newEntity = true;
    @Override public boolean isNew() { return newEntity; }
    @PostLoad @PostPersist private void persisted() { newEntity = false; }
}
