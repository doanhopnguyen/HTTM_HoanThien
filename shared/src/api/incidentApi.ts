import type {
  Incident,
  IncidentAction,
  IncidentHistory,
  IncidentStatus,
} from "../types";
import type { Http, PageParams } from "./http";

export interface IncidentFilter extends PageParams {
  /** One status or several (sent as repeated `status` parameters). */
  status?: IncidentStatus | IncidentStatus[];
  cameraId?: string;
  handledBy?: string;
  from?: string;
  to?: string;
  search?: string;
}
export interface HistoryParams extends PageParams {
  order?: "asc" | "desc";
}
export function incidentApi(http: Http) {
  return {
    list: (params?: IncidentFilter) =>
      http.page<Incident>("/api/incidents", params),
    get: (id: string) => http.get<Incident>(`/api/incidents/${id}`),
    /** Timeline, oldest first unless `order: "desc"`. */
    history: (id: string, params?: HistoryParams) =>
      http.page<IncidentHistory>(`/api/incidents/${id}/history`, params),
    action: (id: string, action: IncidentAction, note?: string) =>
      http.patch<Incident>(
        `/api/incidents/${id}/${action}`,
        note ? { note } : undefined,
      ),
  };
}
