package com.poolsafety.dashboard;

import com.poolsafety.incident.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController @RequestMapping("/api/dashboard") @RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboard;private final IncidentService incidents;
    @GetMapping("/summary") DashboardDto.Summary summary(){return dashboard.summary();}
    @GetMapping("/recent-incidents") Page<IncidentDto.Response> recent(@RequestParam(defaultValue="10") int size){if(size<1||size>50)throw new com.poolsafety.common.ApiException(400,"INVALID_PAGE","size must be between 1 and 50");return incidents.list(null,null,null,null,null,null,0,size);}
    @GetMapping("/incident-statistics") List<DashboardDto.Day> days(@RequestParam(defaultValue="7") int days){return dashboard.days(days);}
    @GetMapping("/camera-statistics") List<DashboardDto.CameraCount> cameras(@RequestParam(defaultValue="30") int days){return dashboard.cameras(days);}
    @GetMapping("/report") @PreAuthorize("hasRole('ADMIN')") DashboardDto.Report report(@RequestParam(defaultValue="30") int days){return dashboard.report(days);}
}
