import { activeStatuses, type IncidentStatus } from "@pool-safety/shared";
import { api } from "../api/client";
const closedStatuses: IncidentStatus[] = ["RESOLVED", "FALSE_ALARM"];
/** Screen-level incident queries; screens call these instead of composing API requests. */
export const incidentService = {
  /** Home: dashboard counters, recent incidents and my newest active incident. */
  async home(userId: string) {
    const [summary, recent, mine] = await Promise.all([
      api.dashboard.summary(),
      api.dashboard.recent(5),
      api.incidents.list({
        handledBy: userId,
        status: activeStatuses,
        size: 1,
      }),
    ]);
    return {
      summary,
      recent: recent.content,
      myIncident: mine.content[0] ?? null,
      myActiveCount: mine.totalElements,
    };
  },
  /** Alerts: active incidents (optionally a single status), newest first, one paged request. */
  alerts(page: number, status?: IncidentStatus) {
    return api.incidents.list({
      page,
      size: 15,
      status: status ?? activeStatuses,
    });
  },
  /** History: closed incidents, by default the ones I handled. */
  history(page: number, userId: string | null, status?: IncidentStatus) {
    return api.incidents.list({
      page,
      size: 15,
      status: status ?? closedStatuses,
      handledBy: userId ?? undefined,
    });
  },
  /** My active incidents (all of them, used by the Home "view all" link). */
  mine(page: number, userId: string) {
    return api.incidents.list({
      page,
      size: 15,
      status: activeStatuses,
      handledBy: userId,
    });
  },
};
