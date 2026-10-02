package com.poolsafety.auth;

import com.poolsafety.security.CurrentUser;
import com.poolsafety.user.UserDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;
    private final CurrentUser current;
    @PostMapping("/login") AuthDto.Session login(@Valid @RequestBody AuthDto.Login r) { return auth.login(r); }
    @PostMapping("/refresh") AuthDto.Session refresh(@Valid @RequestBody AuthDto.Refresh r) { return auth.rotate(r); }
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT) void logout(@Valid @RequestBody AuthDto.Refresh r) { auth.logout(current.get(),r); }
    @PostMapping("/change-password") @ResponseStatus(HttpStatus.NO_CONTENT) void changePassword(@Valid @RequestBody AuthDto.ChangePassword r) { auth.changePassword(current.get(),r); }
    @GetMapping("/me") UserDto.Response me() { return UserDto.Response.of(current.get()); }
}
