package com.poolsafety.security;

import com.poolsafety.user.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.UUID;

@Service
public class TokenService {
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final UserRepository users;
    private final int minutes;
    public TokenService(JwtEncoder encoder, JwtDecoder decoder, UserRepository users, @Value("${app.access-minutes}") int minutes) {
        this.encoder=encoder; this.decoder=decoder; this.users=users; this.minutes=minutes;
    }
    public String issue(User user) {
        var claims=JwtClaimsSet.builder().issuer("pool-safety").subject(user.getId().toString())
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(minutes*60L))
                .claim("version",user.getAuthVersion()).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
    }
    public User user(Jwt jwt) {
        try {
            var user=users.findById(UUID.fromString(jwt.getSubject())).orElseThrow(() -> new JwtException("Invalid account"));
            Number version=jwt.getClaim("version");
            if(user.getStatus()!=UserStatus.ACTIVE || version==null || version.intValue()!=user.getAuthVersion()) throw new JwtException("Session revoked");
            return user;
        } catch(IllegalArgumentException ex) { throw new JwtException("Invalid subject"); }
    }
    public Jwt decode(String token) { var jwt=decoder.decode(token); user(jwt); return jwt; }
}
