package com.poolsafety.dashboard;

import com.poolsafety.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.*;

@Service
public class DashboardService {
    private final DashboardRepository data;private final ZoneId zone;
    public DashboardService(DashboardRepository data,@Value("${app.timezone}") String timezone){this.data=data;this.zone=ZoneId.of(timezone);}
    public DashboardDto.Summary summary(){var today=LocalDate.now(zone);return data.summary(today.atStartOfDay(zone).toInstant(),today.plusDays(1).atStartOfDay(zone).toInstant());}
    public List<DashboardDto.Day> days(int days){var start=from(days);var today=LocalDate.now(zone);return data.days(today.minusDays(days-1L),today,start,zone.getId());}
    public List<DashboardDto.CameraCount> cameras(int days){return data.cameras(from(days));}
    public DashboardDto.Report report(int days){return data.report(from(days));}
    private Instant from(int days){if(days<1||days>365)throw new ApiException(400,"INVALID_DAYS","days must be between 1 and 365");return LocalDate.now(zone).minusDays(days-1L).atStartOfDay(zone).toInstant();}
}
