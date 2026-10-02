package com.poolsafety.user;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.UUID;

public final class UserDto {
    private UserDto() {}
    public record Response(UUID id, String username, String email, String fullName, Role role, UserStatus status, Instant createdAt) {
        public static Response of(User u) { return new Response(u.getId(), u.getUsername(), u.getEmail(), u.getFullName(), u.getRole(), u.getStatus(), u.getCreatedAt()); }
    }
    public record Create(@NotBlank @Pattern(regexp="[A-Za-z0-9_.-]{3,100}") String username,
                         @NotBlank @Email @Size(max=255) String email,
                         @NotBlank @Size(min=10,max=72) String password,
                         @NotBlank @Size(max=150) String fullName, @NotNull Role role) {}
    public record Update(@Email @Size(max=255) String email, @Size(min=1,max=150) String fullName, Role role) {}
    public record Status(@NotNull UserStatus status) {}
}
