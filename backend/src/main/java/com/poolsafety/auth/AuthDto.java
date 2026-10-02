package com.poolsafety.auth;

import com.poolsafety.user.UserDto;
import jakarta.validation.constraints.*;

public final class AuthDto {
    private AuthDto() {}
    public record Login(@NotBlank @Size(max=100) String username,@NotBlank @Size(max=72) String password,@Size(max=255) String deviceName) {}
    public record Refresh(@NotBlank @Size(max=255) String refreshToken,@Size(max=255) String deviceName) {}
    public record ChangePassword(@NotBlank String currentPassword,@NotBlank @Size(min=10,max=72) String newPassword) {}
    public record Session(String accessToken,String refreshToken,UserDto.Response user) {}
}
