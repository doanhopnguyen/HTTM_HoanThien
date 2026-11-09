import type { AuditLog } from "../types";
import type { Http, PageParams } from "./http";

export interface AuditFilter extends PageParams {
  action?: string;
  userId?: string;
  entityType?: string;
  from?: string;
  to?: string;
}
export function auditApi(http: Http) {
  return (params?: AuditFilter) =>
    http.page<AuditLog>("/api/audit-logs", params);
}
