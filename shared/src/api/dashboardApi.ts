import type {
  CameraStatistic,
  DashboardSummary,
  DayStatistic,
  Incident,
  Report,
} from "../types";
import type { Http } from "./http";

export function dashboardApi(http: Http) {
  return {
    summary: () => http.get<DashboardSummary>("/api/dashboard/summary"),
    recent: (size = 10) =>
      http.page<Incident>("/api/dashboard/recent-incidents", { size }),
    /** One entry per day, including days without incidents. */
    statistics: (days = 7) =>
      http.get<DayStatistic[]>("/api/dashboard/incident-statistics", { days }),
    cameras: (days = 30) =>
      http.get<CameraStatistic[]>("/api/dashboard/camera-statistics", {
        days,
      }),
    /** ADMIN only. */
    report: (days = 30) => http.get<Report>("/api/dashboard/report", { days }),
  };
}
