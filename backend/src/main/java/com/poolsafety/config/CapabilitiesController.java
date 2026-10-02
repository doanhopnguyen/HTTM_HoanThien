package com.poolsafety.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
public class CapabilitiesController {
    private final boolean staffFalseAlarm;private final String timezone;
    public CapabilitiesController(@Value("${app.staff-false-alarm}") boolean flag,@Value("${app.timezone}") String timezone){this.staffFalseAlarm=flag;this.timezone=timezone;}
    @GetMapping("/api/capabilities") public Map<String,Object> get(){return Map.of("staffFalseAlarm",staffFalseAlarm,"timezone",timezone);}
}
