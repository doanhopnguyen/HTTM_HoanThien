package com.poolsafety.dashboard;

import com.poolsafety.incident.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import java.util.List;

@RestController @RequestMapping("/api/dashboard") @RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboard;private final IncidentService incidents;
    @GetMapping("/summary") DashboardDto.Summary summary(){return dashboard.summary();}
    @GetMapping("/recent-incidents") Page<IncidentDto.Response> recent(){return incidents.list(null,null,null,null,null,null,0,10);}
    @GetMapping("/incident-statistics") List<DashboardDto.Day> days(@RequestParam(defaultValue="7") int days){return dashboard.days(days);}
    @GetMapping("/camera-statistics") List<DashboardDto.CameraCount> cameras(@RequestParam(defaultValue="30") int days){return dashboard.cameras(days);}
    @GetMapping("/report") DashboardDto.Report report(@RequestParam(defaultValue="30") int days){return dashboard.report(days);}
}
