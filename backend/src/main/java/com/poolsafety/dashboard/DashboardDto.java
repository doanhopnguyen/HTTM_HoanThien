package com.poolsafety.dashboard;

public final class DashboardDto {
    private DashboardDto() {}
    public record Summary(long totalCameras,long onlineCameras,long offlineCameras,long monitoringCameras,long activeIncidents,long incidentsToday,long resolvedToday,long falseAlarmToday) {}
    public record Day(String date,long total,long resolved,long falseAlarms) {}
    /** incidents/resolved/falseAlarms cover the requested period; active counts every open incident regardless of age. */
    public record CameraCount(String cameraId,String name,String status,long incidents,long resolved,long falseAlarms,long active) {}
    /** Averages in seconds: response = created to acknowledged, handling = acknowledged to resolved, resolution = created to resolved/false alarm. */
    public record Report(long total,long resolved,long falseAlarms,long active,Double averageHandlingSeconds,Double averageResponseSeconds,Double averageResolutionSeconds) {}
}
