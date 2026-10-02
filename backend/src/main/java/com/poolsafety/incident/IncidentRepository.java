package com.poolsafety.incident;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface IncidentRepository extends JpaRepository<Incident, UUID>, JpaSpecificationExecutor<Incident> {
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select i from Incident i where i.id = :id")
Optional<Incident> lockById(@Param("id") UUID id);
}
