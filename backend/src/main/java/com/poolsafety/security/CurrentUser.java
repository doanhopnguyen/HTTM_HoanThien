package com.poolsafety.security;

import com.poolsafety.user.*;
import com.poolsafety.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import java.util.UUID;

@Component @RequiredArgsConstructor
public class CurrentUser {
    private final UserRepository users;
    public User get() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) throw new ApiException(401,"UNAUTHORIZED","Login required");
        return users.findById(UUID.fromString(jwt.getSubject())).orElseThrow(() -> ApiException.missing("User"));
    }
}
