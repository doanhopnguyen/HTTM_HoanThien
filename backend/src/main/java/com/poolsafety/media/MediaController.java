package com.poolsafety.media;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.*;
import org.springframework.core.io.*;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;
import java.io.IOException;

@RestController @RequiredArgsConstructor
public class MediaController {
    private final MediaStorage storage;
    @PostMapping(value="/api/media/videos", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')") @ResponseStatus(HttpStatus.CREATED)
    MediaStorage.Asset video(@RequestPart("file") MultipartFile file) throws IOException { return storage.save(file,"videos"); }
    @PostMapping(value="/api/media/models", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')") @ResponseStatus(HttpStatus.CREATED)
    MediaStorage.Asset model(@RequestPart("file") MultipartFile file) throws IOException { return storage.save(file,"models"); }
    // Opaque, unguessable playback URLs allow native video players and HTTP Range requests.
    // Model files are never served by this route.
    @GetMapping("/api/media/videos/{id}")
    ResponseEntity<Resource> playback(@PathVariable String id) {
        var file = storage.path("videos",id);
        var type = id.endsWith(".webm") ? "video/webm" : id.endsWith(".mov") ? "video/quicktime" : "video/mp4";
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(type))
            .header("X-Content-Type-Options","nosniff")
            .body(new FileSystemResource(file));
    }
}
