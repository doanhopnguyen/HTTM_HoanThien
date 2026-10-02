package com.poolsafety.detection;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface DetectionEventRepository extends JpaRepository<DetectionEvent, UUID>, JpaSpecificationExecutor<DetectionEvent> {
boolean existsByCameraId(UUID cameraId);
}
