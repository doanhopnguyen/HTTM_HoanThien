import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { activeStatuses } from "@pool-safety/shared";
import { api } from "../../api/client";
import { useResource } from "../../hooks/useResource";
import {
  PageHeader,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Pagination,
} from "../../components/ui";
import { CameraCard } from "../../components/CameraCard";
import { IncidentCard } from "../../components/IncidentCard";
const CAMERAS_PER_PAGE = 6;
/**
 * Camera grid plus the active alert list. `?camera=<id>` loads that camera directly and shows it
 * highlighted above the grid, whatever page it would be on.
 */
export function MonitorPage() {
  const [params] = useSearchParams();
  const focus = params.get("camera");
  const [page, setPage] = useState(0);
  const cameras = useResource(
    () => api.cameras.list({ page, size: CAMERAS_PER_PAGE }),
    [page],
  );
  const focused = useResource(
    () => (focus ? api.cameras.get(focus) : Promise.resolve(null)),
    [focus],
  );
  const focusOnPage = !!cameras.data?.content.some((c) => c.id === focus);
  const alerts = useResource(() =>
    api.incidents.list({ status: activeStatuses, size: 20 }),
  );
  return (
    <>
      <PageHeader
        title="Live monitor"
        description="Camera feeds and active rescue alerts"
      />
      <div className="monitor-layout">
        <section>
          {focused.data && !focusOnPage && (
            <div className="camera-grid focused-camera">
              <CameraCard camera={focused.data} highlighted />
            </div>
          )}
          {cameras.error && (
            <ErrorState message={cameras.error} onRetry={cameras.reload} />
          )}
          {!cameras.data && cameras.loading && <LoadingSpinner />}
          {cameras.data && (
            <>
              <div className="camera-grid">
                {cameras.data.content.map((c) => (
                  <CameraCard
                    key={c.id}
                    camera={c}
                    highlighted={c.id === focus}
                  />
                ))}
              </div>
              {!cameras.data.content.length && (
                <EmptyState message="No cameras configured" />
              )}
              <Pagination
                page={page}
                total={cameras.data.totalElements}
                totalPages={cameras.data.totalPages}
                change={setPage}
              />
            </>
          )}
        </section>
        <aside className="panel active-panel">
          <h2>Active alerts</h2>
          {alerts.error && (
            <ErrorState message={alerts.error} onRetry={alerts.reload} />
          )}
          {!alerts.data && alerts.loading && <LoadingSpinner />}
          {alerts.data?.content.map((i) => (
            <IncidentCard key={i.id} incident={i} />
          ))}
          {alerts.data && !alerts.data.totalElements && (
            <EmptyState message="No active alerts" />
          )}
          {alerts.data &&
            alerts.data.totalElements > alerts.data.content.length && (
              <small className="muted">
                Showing {alerts.data.content.length} of{" "}
                {alerts.data.totalElements} active alerts
              </small>
            )}
        </aside>
      </div>
    </>
  );
}
