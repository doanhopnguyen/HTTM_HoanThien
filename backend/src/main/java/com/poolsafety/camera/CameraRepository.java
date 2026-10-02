package com.poolsafety.camera;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface CameraRepository extends JpaRepository<Camera, UUID>, JpaSpecificationExecutor<Camera> {
Page<Camera> findByStatus(CameraStatus status, Pageable page);
}
