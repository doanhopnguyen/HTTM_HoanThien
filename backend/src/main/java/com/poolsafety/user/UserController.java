package com.poolsafety.user;

import com.poolsafety.common.Pages;
import com.poolsafety.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import java.util.UUID;

@RestController @RequestMapping("/api/users") @PreAuthorize("hasRole('ADMIN')") @RequiredArgsConstructor
public class UserController {
    private final UserService service;private final UserRepository users;private final CurrentUser current;
    @GetMapping Page<UserDto.Response> list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {return users.findAll(Pages.of(page,size)).map(UserDto.Response::of);}
    @GetMapping("/staff") Page<UserDto.Response> staff(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="100") int size) {return users.findByRole(Role.STAFF,Pages.of(page,size)).map(UserDto.Response::of);}
    @GetMapping("/{id}") UserDto.Response get(@PathVariable UUID id){return UserDto.Response.of(service.get(id));}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) UserDto.Response create(@Valid @RequestBody UserDto.Create r){return service.create(current.get(),r);}
    @PatchMapping("/{id}") UserDto.Response update(@PathVariable UUID id,@Valid @RequestBody UserDto.Update r){return service.update(current.get(),id,r);}
    @PatchMapping("/{id}/status") UserDto.Response status(@PathVariable UUID id,@Valid @RequestBody UserDto.Status r){return service.status(current.get(),id,r.status());}
}
