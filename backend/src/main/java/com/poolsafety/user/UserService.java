package com.poolsafety.user;

import com.poolsafety.audit.AuditService;
import com.poolsafety.auth.*;
import com.poolsafety.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class UserService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final RefreshTokenRepository refresh;
    private final AuditService audit;
    public User get(UUID id) { return users.findById(id).orElseThrow(()->ApiException.missing("User")); }
    @Transactional public UserDto.Response create(User actor,UserDto.Create r) {
        AuthService.checkPassword(r.password());
        var u=new User();u.setUsername(r.username());u.setEmail(r.email());u.setFullName(r.fullName());u.setRole(r.role());u.setPasswordHash(passwords.encode(r.password()));users.saveAndFlush(u);
        audit.record(actor.getId(),"CREATE_USER","USER",u.getId(),u.getUsername());return UserDto.Response.of(u);
    }
    @Transactional public UserDto.Response update(User actor,UUID id,UserDto.Update r) {
        var u=users.lockById(id).orElseThrow(()->ApiException.missing("User"));
        if(actor.getId().equals(id) && r.role()!=null && r.role()!=Role.ADMIN) throw new ApiException(400,"SELF_DEMOTION","Cannot demote your own administrator account");
        if(r.email()!=null)u.setEmail(r.email());if(r.fullName()!=null)u.setFullName(r.fullName());
        if(r.role()!=null && r.role()!=u.getRole()){u.setRole(r.role());u.setAuthVersion(u.getAuthVersion()+1);refresh.revokeAll(id,Instant.now());}
        u.setUpdatedAt(Instant.now());users.flush();audit.record(actor.getId(),"UPDATE_USER","USER",id,u.getUsername());return UserDto.Response.of(u);
    }
    @Transactional public UserDto.Response status(User actor,UUID id,UserStatus status) {
        var u=users.lockById(id).orElseThrow(()->ApiException.missing("User"));
        if(actor.getId().equals(id) && status==UserStatus.DISABLED)throw new ApiException(400,"SELF_DISABLE","Cannot disable your own administrator account");
        u.setStatus(status);u.setUpdatedAt(Instant.now());u.setAuthVersion(u.getAuthVersion()+1);refresh.revokeAll(id,Instant.now());
        audit.record(actor.getId(),status==UserStatus.DISABLED?"DISABLE_USER":"ACTIVATE_USER","USER",id,u.getUsername());return UserDto.Response.of(u);
    }
}
