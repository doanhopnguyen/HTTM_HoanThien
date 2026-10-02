package com.poolsafety.incident;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface IncidentHistoryRepository extends JpaRepository<IncidentHistory, UUID>, JpaSpecificationExecutor<IncidentHistory> {
Page<IncidentHistory> findByIncidentId(UUID id, Pageable page);
}
