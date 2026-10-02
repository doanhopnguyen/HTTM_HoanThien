package com.poolsafety.detection;

import com.poolsafety.common.ApiException;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

@RestController @RequestMapping("/api/detection-events")
public class DetectionController {
    private final DetectionService service;private final byte[] secret;
    public DetectionController(DetectionService service,@Value("${app.ai-service-key}") String key){this.service=service;if(key.length()<24)throw new IllegalArgumentException("AI_SERVICE_KEY requires at least 24 characters");this.secret=key.getBytes(StandardCharsets.UTF_8);}
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    DetectionDto.Created create(@RequestHeader(value="X-AI-SERVICE-KEY",required=false) String key,@Valid @RequestBody DetectionDto.Create r) {
        if(key==null||!MessageDigest.isEqual(secret,key.getBytes(StandardCharsets.UTF_8)))throw new ApiException(401,"INVALID_SERVICE_KEY","AI service authentication required");
        return service.create(r);
    }
}
