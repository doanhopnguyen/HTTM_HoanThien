package com.poolsafety.notification;

import com.poolsafety.common.Pages;
import com.poolsafety.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import java.util.*;

@RestController @RequestMapping("/api/notifications") @RequiredArgsConstructor
public class NotificationController {
    private final NotificationRepository notifications;private final NotificationService service;private final CurrentUser current;
    @GetMapping Page<NotificationDto> list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return notifications.findByUserId(current.get().getId(),Pages.of(page,size)).map(NotificationDto::of);}
    @GetMapping("/unread-count") Map<String,Long> count(){return Map.of("count",notifications.countByUserIdAndReadFalse(current.get().getId()));}
    @PatchMapping("/{id}/read") NotificationDto read(@PathVariable UUID id){return service.read(current.get().getId(),id);}
    @PatchMapping("/read-all") @ResponseStatus(HttpStatus.NO_CONTENT) void all(){service.readAll(current.get().getId());}
}
