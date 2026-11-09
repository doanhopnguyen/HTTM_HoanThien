package com.poolsafety.camera;

import com.poolsafety.common.Pages;
import com.poolsafety.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import java.util.UUID;

@RestController @RequestMapping("/api/cameras") @RequiredArgsConstructor
public class CameraController {
    private final CameraRepository cameras;private final CameraService service;private final CurrentUser current;
    @GetMapping Page<CameraDto.Response> list(@RequestParam(required=false) CameraStatus status,@RequestParam(required=false) String search,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.list(status,search,page,size);}
    @GetMapping("/online") Page<CameraDto.Response> online(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return cameras.findByStatus(CameraStatus.ONLINE,Pages.of(page,size)).map(CameraDto.Response::of);}
    @GetMapping("/{id}") CameraDto.Response get(@PathVariable UUID id){return CameraDto.Response.of(service.get(id));}
    @PostMapping @PreAuthorize("hasRole('ADMIN')") @ResponseStatus(HttpStatus.CREATED) CameraDto.Response create(@Valid @RequestBody CameraDto.Create r){return service.create(current.get(),r);}
    @PatchMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") CameraDto.Response update(@PathVariable UUID id,@Valid @RequestBody CameraDto.Update r){return service.update(current.get(),id,r);}
    @PatchMapping("/{id}/monitoring") @PreAuthorize("hasRole('ADMIN')") CameraDto.Response monitoring(@PathVariable UUID id,@Valid @RequestBody CameraDto.Monitoring r){return service.monitoring(current.get(),id,r.enabled());}
    @PatchMapping("/{id}/status") @PreAuthorize("hasRole('ADMIN')") CameraDto.Response status(@PathVariable UUID id,@Valid @RequestBody CameraDto.Status r){return service.status(current.get(),id,r.status());}
    @DeleteMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(@PathVariable UUID id){service.delete(current.get(),id);}
}
