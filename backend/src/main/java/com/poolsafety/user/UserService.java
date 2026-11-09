package com.poolsafety.user;

import com.poolsafety.audit.AuditService;
import com.poolsafety.auth.*;
import com.poolsafety.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;
import com.poolsafety.common.Pages;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;

@Service @RequiredArgsConstructor
public class UserService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final RefreshTokenRepository refresh;
    private final AuditService audit;
    @Transactional(readOnly=true) public Page<UserDto.Response> list(Role role,UserStatus status,String search,int page,int size) {
        Specification<User> spec=(root,q,b)->{
            var p=new ArrayList<Predicate>();
            if(role!=null)p.add(b.equal(root.get("role"),role));if(status!=null)p.add(b.equal(root.get("status"),status));
            if(search!=null&&!search.isBlank()){String term=Pages.likeTerm(search);
                p.add(b.or(b.like(b.lower(root.get("username")),term,'\\'),b.like(b.lower(root.get("fullName")),term,'\\'),b.like(b.lower(root.get("email")),term,'\\')));}
            return b.and(p.toArray(Predicate[]::new));
        };
        return users.findAll(spec,Pages.of(page,size)).map(UserDto.Response::of);
    }
    /** Administrator sets a new password; every session of that account is revoked. */
    @Transactional public void resetPassword(User actor,UUID id,String password) {
        if(actor.getId().equals(id))throw new ApiException(400,"SELF_RESET","Use Change password for your own account");
        AuthService.checkPassword(password);
        var u=users.lockById(id).orElseThrow(()->ApiException.missing("User"));
        u.setPasswordHash(passwords.encode(password));u.setAuthVersion(u.getAuthVersion()+1);u.setUpdatedAt(Instant.now());refresh.revokeAll(id,Instant.now());
        audit.record(actor.getId(),"RESET_PASSWORD","USER",id,u.getUsername());
    }
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
