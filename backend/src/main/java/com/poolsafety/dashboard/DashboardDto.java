package com.poolsafety.dashboard;

public final class DashboardDto {
    private DashboardDto() {}
    public record Summary(long totalCameras,long onlineCameras,long offlineCameras,long monitoringCameras,long activeIncidents,long incidentsToday,long resolvedToday,long falseAlarmToday) {}
    public record Day(String date,long total,long resolved,long falseAlarms) {}
    public record CameraCount(String cameraId,String name,String status,long incidents) {}
    public record Report(long total,long resolved,long falseAlarms,Double averageHandlingSeconds) {}
}
