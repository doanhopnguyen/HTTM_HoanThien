package com.poolsafety.notification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface NotificationRepository extends JpaRepository<Notification, UUID>, JpaSpecificationExecutor<Notification> {
Page<Notification> findByUserId(UUID id, Pageable page);
long countByUserIdAndReadFalse(UUID id);
Optional<Notification> findByIdAndUserId(UUID id, UUID userId);
@Modifying @Query("update Notification n set n.read=true, n.readAt=:now where n.userId=:id and n.read=false")
int readAll(@Param("id") UUID id, @Param("now") java.time.Instant now);
}
