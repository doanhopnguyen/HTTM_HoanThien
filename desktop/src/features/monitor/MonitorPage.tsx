import { useState } from "react";
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
import { activeStatuses } from "@pool-safety/shared";
export function MonitorPage() {
  const [page, setPage] = useState(0);
  const resource = useResource(
    () =>
      Promise.all([
        api.cameras.list({ page, size: 6 }),
        Promise.all(
          activeStatuses.map((status) =>
            api.incidents.list({ status, size: 20 }),
          ),
        ),
      ]),
    [page],
  );
  return (
    <>
      <PageHeader
        title="Live monitor"
        description="Camera feeds and active rescue alerts"
      />
      {resource.error && <ErrorState message={resource.error} />}
      {!resource.data && resource.loading && <LoadingSpinner />}
      {resource.data && (
        <div className="monitor-layout">
          <section>
            <div className="camera-grid">
              {resource.data[0].content.map((c) => (
                <CameraCard key={c.id} camera={c} />
              ))}
            </div>
            {!resource.data[0].content.length && (
              <EmptyState message="No cameras configured" />
            )}
            <Pagination
              page={page}
              total={resource.data[0].totalElements}
              totalPages={resource.data[0].totalPages}
              change={setPage}
            />
          </section>
          <aside className="panel active-panel">
            <h2>Active alerts</h2>
            {resource.data[1]
              .flatMap((p) => p.content)
              .map((i) => (
                <IncidentCard key={i.id} incident={i} />
              ))}
            {resource.data[1].every((p) => !p.totalElements) && (
              <EmptyState message="No active alerts" />
            )}
          </aside>
        </div>
      )}
    </>
  );
}
