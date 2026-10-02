package com.poolsafety.auth;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID>, JpaSpecificationExecutor<RefreshToken> {
Optional<RefreshToken> findByTokenHash(String tokenHash);
@Query("select t.userId from RefreshToken t where t.tokenHash = :hash")
Optional<UUID> findUserIdByTokenHash(@Param("hash") String hash);
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select t from RefreshToken t where t.tokenHash = :hash")
Optional<RefreshToken> lockByHash(@Param("hash") String hash);
@Modifying @Query("update RefreshToken t set t.revokedAt = :now where t.userId = :id and t.revokedAt is null")
int revokeAll(@Param("id") UUID id, @Param("now") java.time.Instant now);
}
