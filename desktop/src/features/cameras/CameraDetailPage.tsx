import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useResource } from "../../hooks/useResource";
import {
  PageHeader,
  StatusBadge,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Pagination,
  date,
} from "../../components/ui";
import { CameraCard } from "../../components/CameraCard";
import { IncidentCard } from "../../components/IncidentCard";
/** Camera information, live stream and the incidents it raised. */
export function CameraDetailPage() {
  const { id = "" } = useParams();
  const [page, setPage] = useState(0);
  const camera = useResource(() => api.cameras.get(id), [id]);
  const incidents = useResource(
    () => api.incidents.list({ cameraId: id, page, size: 6 }),
    [id, page],
  );
  const c = camera.data;
  return (
    <>
      <Link to="/monitor">← Live monitor</Link>
      <PageHeader
        title={c ? c.name : "Camera"}
        description={c?.locationDescription || undefined}
      >
        <Link to="/cameras">Manage cameras</Link>
      </PageHeader>
      {camera.error && (
        <ErrorState message={camera.error} onRetry={camera.reload} />
      )}
      {!c && camera.loading && <LoadingSpinner />}
      {c && (
        <div className="two-columns">
          <section>
            <CameraCard camera={c} />
          </section>
          <section className="panel">
            <h2>Camera information</h2>
            <dl className="details">
              <dt>Code</dt>
              <dd>{c.code}</dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={c.status} />
              </dd>
              <dt>Monitoring</dt>
              <dd>{c.monitoringEnabled ? "Enabled" : "Paused"}</dd>
              <dt>Source</dt>
              <dd className="truncate">
                {c.streamUrlMasked || "Not configured"}
              </dd>
              <dt>Created</dt>
              <dd>{date(c.createdAt)}</dd>
              <dt>Updated</dt>
              <dd>{date(c.updatedAt)}</dd>
            </dl>
          </section>
        </div>
      )}
      <section className="panel">
        <h2>Incidents from this camera</h2>
        {incidents.error && (
          <ErrorState message={incidents.error} onRetry={incidents.reload} />
        )}
        {!incidents.data && incidents.loading && <LoadingSpinner />}
        {incidents.data && (
          <>
            <div className="incident-stack">
              {incidents.data.content.map((i) => (
                <IncidentCard key={i.id} incident={i} />
              ))}
            </div>
            {!incidents.data.content.length && (
              <EmptyState message="This camera has not raised any incidents" />
            )}
            <Pagination
              page={page}
              total={incidents.data.totalElements}
              totalPages={incidents.data.totalPages}
              change={setPage}
            />
          </>
        )}
      </section>
    </>
  );
}
