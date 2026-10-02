package com.poolsafety.security;

import com.poolsafety.common.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;
import org.springframework.http.HttpMethod;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Arrays;

@Configuration @EnableMethodSecurity
public class SecurityConfig {
    @Bean PasswordEncoder passwords() { return new BCryptPasswordEncoder(12); }
    @Bean SecretKeySpec signingKey(@Value("${app.jwt-secret}") String secret) {
        if(secret.getBytes(StandardCharsets.UTF_8).length<32) throw new IllegalArgumentException("JWT_SECRET requires at least 32 bytes");
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256");
    }
    @Bean JwtEncoder encoder(SecretKeySpec key) { return new NimbusJwtEncoder(new ImmutableSecret<>(key)); }
    @Bean JwtDecoder decoder(SecretKeySpec key) {
        var decoder=NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("pool-safety"));
        return decoder;
    }
    @Bean CorsConfigurationSource corsConfigurationSource(@Value("${app.allowed-origins}") String origins) {
        var config=new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(origins.split(",")));
        config.setAllowedMethods(List.of("GET","POST","PATCH","DELETE","OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization","Content-Type","X-AI-SERVICE-KEY"));
        var source=new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**",config); return source;
    }
    @Bean SecurityFilterChain security(HttpSecurity http, TokenService tokens, ObjectMapper json) throws Exception {
        http.csrf(c->c.disable()).cors(c->{})
            .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.requestMatchers("/api/auth/login","/api/auth/refresh","/api/detection-events","/ws","/swagger-ui/**","/swagger-ui","/api-docs/**","/actuator/health").permitAll()
                .requestMatchers("/api/users/**","/api/audit-logs","/api/settings").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST,"/api/cameras/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH,"/api/cameras/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE,"/api/cameras/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .oauth2ResourceServer(o->o.jwt(j->j.jwtAuthenticationConverter(jwt->{
                try { var user=tokens.user(jwt); return new JwtAuthenticationToken(jwt,List.of(new SimpleGrantedAuthority("ROLE_"+user.getRole())),user.getUsername()); }
                catch(JwtException e) { throw new BadCredentialsException("Session revoked",e); }
            })).authenticationEntryPoint((r,s,e)->{s.setStatus(401);s.setContentType("application/json");json.writeValue(s.getOutputStream(),ErrorResponse.of(401,"UNAUTHORIZED","Login required or session expired",r.getRequestURI()));}))
            .exceptionHandling(e->e.authenticationEntryPoint((r,s,ex)->{s.setStatus(401);s.setContentType("application/json");json.writeValue(s.getOutputStream(),ErrorResponse.of(401,"UNAUTHORIZED","Login required",r.getRequestURI()));})
                .accessDeniedHandler((r,s,ex)->{s.setStatus(403);s.setContentType("application/json");json.writeValue(s.getOutputStream(),ErrorResponse.of(403,"FORBIDDEN","Access denied",r.getRequestURI()));}));
        return http.build();
    }
}
