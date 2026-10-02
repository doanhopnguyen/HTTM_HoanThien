package com.poolsafety.user;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {
Optional<User> findByUsername(String username);
@Query("select u.id from User u where u.username = :username")
Optional<UUID> findIdByUsername(@Param("username") String username);
List<User> findByStatus(UserStatus status);
Page<User> findByRole(Role role, Pageable page);
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select u from User u where u.id = :id")
Optional<User> lockById(@Param("id") UUID id);
}
