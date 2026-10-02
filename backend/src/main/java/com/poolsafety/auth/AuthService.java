package com.poolsafety.auth;

import com.poolsafety.user.*;
import com.poolsafety.security.TokenService;
import com.poolsafety.audit.AuditService;
import com.poolsafety.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.security.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class AuthService {
    private final UserRepository users;
    private final RefreshTokenRepository refresh;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final AuditService audit;
    private final int days;
    private final String dummy;
    public AuthService(UserRepository users,RefreshTokenRepository refresh,PasswordEncoder passwords,TokenService tokens,AuditService audit,@Value("${app.refresh-days}") int days) {
        this.users=users;this.refresh=refresh;this.passwords=passwords;this.tokens=tokens;this.audit=audit;this.days=days;this.dummy=passwords.encode(UUID.randomUUID().toString());
    }
    @Transactional
    public AuthDto.Session login(AuthDto.Login r) {
        User user=users.findIdByUsername(r.username()).flatMap(users::lockById).orElse(null);
        boolean matches=passwords.matches(r.password(),user==null?dummy:user.getPasswordHash());
        if(user==null || !matches || user.getStatus()!=UserStatus.ACTIVE) throw new ApiException(401,"INVALID_CREDENTIALS","Invalid username or password");
        audit.record(user.getId(),"LOGIN","USER",user.getId(),"Login");
        return session(user,r.deviceName());
    }
    @Transactional
    public AuthDto.Session rotate(AuthDto.Refresh r) {
        String tokenHash=hash(r.refreshToken());
        var owner=refresh.findUserIdByTokenHash(tokenHash).orElseThrow(()->new ApiException(401,"INVALID_REFRESH_TOKEN","Invalid refresh token"));
        // Lock the account before its tokens in every auth flow: logout cannot race rotation.
        var user=users.lockById(owner).orElseThrow(()->ApiException.missing("User"));
        var stored=refresh.lockByHash(tokenHash).orElseThrow(()->new ApiException(401,"INVALID_REFRESH_TOKEN","Invalid refresh token"));
        if(stored.getRevokedAt()!=null || !stored.getExpiresAt().isAfter(Instant.now())) throw new ApiException(401,"INVALID_REFRESH_TOKEN","Refresh token expired or revoked");
        if(user.getStatus()!=UserStatus.ACTIVE) throw new ApiException(401,"ACCOUNT_DISABLED","Account disabled");
        stored.setRevokedAt(Instant.now());
        return session(user,r.deviceName());
    }
    @Transactional
    public void logout(User actor,AuthDto.Refresh r) {
        var user=users.lockById(actor.getId()).orElseThrow();
        var stored=refresh.lockByHash(hash(r.refreshToken())).orElse(null);
        if(stored!=null && stored.getUserId().equals(actor.getId())) stored.setRevokedAt(Instant.now());
        // Invalidate outstanding access tokens as well as every refresh session.
        user.setAuthVersion(user.getAuthVersion()+1);
        refresh.revokeAll(user.getId(),Instant.now());
        audit.record(user.getId(),"LOGOUT","USER",user.getId(),"All sessions revoked");
    }
    @Transactional
    public void changePassword(User actor,AuthDto.ChangePassword r) {
        var user=users.lockById(actor.getId()).orElseThrow();
        if(!passwords.matches(r.currentPassword(),user.getPasswordHash())) throw new ApiException(400,"WRONG_PASSWORD","Current password is incorrect");
        checkPassword(r.newPassword());
        user.setPasswordHash(passwords.encode(r.newPassword()));user.setAuthVersion(user.getAuthVersion()+1);user.setUpdatedAt(Instant.now());
        refresh.revokeAll(user.getId(),Instant.now());
        audit.record(user.getId(),"CHANGE_PASSWORD","USER",user.getId(),"Password changed; sessions revoked");
    }
    public static void checkPassword(String value) {
        if(value.getBytes(StandardCharsets.UTF_8).length>72) throw new ApiException(400,"INVALID_PASSWORD","Password must not exceed 72 UTF-8 bytes");
    }
    private AuthDto.Session session(User user,String device) {
        byte[] bytes=new byte[48]; new SecureRandom().nextBytes(bytes);
        String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var stored=new RefreshToken();stored.setUserId(user.getId());stored.setTokenHash(hash(raw));stored.setExpiresAt(Instant.now().plusSeconds(days*86400L));stored.setDeviceName(device);refresh.save(stored);
        return new AuthDto.Session(tokens.issue(user),raw,UserDto.Response.of(user));
    }
    public static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
