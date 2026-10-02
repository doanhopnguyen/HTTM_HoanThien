package com.poolsafety.config;

import com.poolsafety.user.*;
import com.poolsafety.auth.AuthService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BootstrapAdmin implements ApplicationRunner {
    private final UserRepository users;private final PasswordEncoder passwords;private final String password;
    public BootstrapAdmin(UserRepository users,PasswordEncoder passwords,@Value("${BOOTSTRAP_ADMIN_PASSWORD:}") String password){this.users=users;this.passwords=passwords;this.password=password;}
    @Override @Transactional public void run(ApplicationArguments args) {
        if(password.isBlank() || users.count()>0)return;
        if(password.length()<10)throw new IllegalArgumentException("Bootstrap password requires at least 10 characters");AuthService.checkPassword(password);
        var u=new User();u.setUsername("admin");u.setEmail("admin@poolsafety.local");u.setFullName("Pool Administrator");u.setRole(Role.ADMIN);u.setPasswordHash(passwords.encode(password));users.save(u);
    }
}
