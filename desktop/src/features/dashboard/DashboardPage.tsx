import { Link } from "react-router-dom";
import { Camera, TriangleAlert, Activity, CircleCheck } from "lucide-react";
import { api } from "../../api/client";
import { useResource } from "../../hooks/useResource";
import {
  PageHeader,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  StatusBadge,
} from "../../components/ui";
import { CameraCard } from "../../components/CameraCard";
import { IncidentCard } from "../../components/IncidentCard";
import { IncidentChart } from "../reports/IncidentChart";
export function DashboardPage() {
  const resource = useResource(() =>
    Promise.all([
      api.dashboard.summary(),
      api.cameras.list({ size: 4 }),
      api.dashboard.recent(4),
      api.dashboard.statistics(),
      api.dashboard.cameras(1),
    ]),
  );
  const data = resource.data;
  const retry = resource.reload;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A live overview of your pool's safety"
      />
      <div className="connection-hint">
        Stay connected and keep the control center visible while on duty.
      </div>
      {resource.error && (
        <ErrorState message={resource.error} onRetry={retry} />
      )}
      {!data && resource.loading && <LoadingSpinner />}
      {data && (
        <>
          <div className="stat-grid">
            {[
              {
                label: "Cameras online",
                value: `${data[0].onlineCameras} / ${data[0].totalCameras}`,
                Icon: Camera,
              },
              {
                label: "Active incidents",
                value: data[0].activeIncidents,
                Icon: TriangleAlert,
              },
              {
                label: "Incidents today",
                value: data[0].incidentsToday,
                Icon: Activity,
              },
              {
                label: "Resolved today",
                value: data[0].resolvedToday,
                Icon: CircleCheck,
              },
            ].map(({ label, value, Icon }) => (
              <article className="stat-card" key={label}>
                <div>
                  <p>{label}</p>
                  <strong>{value}</strong>
                </div>
                <Icon size={24} />
              </article>
            ))}
          </div>
          <div className="section-heading">
            <h2>Live camera preview</h2>
            <Link to="/monitor">Open live monitor →</Link>
          </div>
          <div className="camera-grid">
            {data[1].content.map((camera) => (
              <CameraCard key={camera.id} camera={camera} />
            ))}
          </div>
          {!data[1].content.length && (
            <EmptyState message="Add your first camera to begin monitoring" />
          )}
          <div className="two-columns">
            <section className="panel">
              <h2>Recent incidents</h2>
              <div className="incident-stack">
                {data[2].content.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))}
                {!data[2].content.length && (
                  <EmptyState message="No incidents recorded" />
                )}
              </div>
            </section>
            <section className="panel">
              <h2>Incidents · Last 7 days</h2>
              <IncidentChart data={data[3]} />
              <h2>Camera status</h2>
              {data[4].map((c) => (
                <Link
                  className="status-row"
                  key={c.cameraId}
                  to={`/cameras/${c.cameraId}`}
                >
                  <span>
                    {c.name}
                    {c.active > 0 && (
                      <small className="critical-text">
                        {" "}
                        · {c.active} active
                      </small>
                    )}
                  </span>
                  <StatusBadge status={c.status} />
                </Link>
              ))}
              {!data[4].length && <EmptyState message="No cameras" />}
            </section>
          </div>
        </>
      )}
    </>
  );
}
