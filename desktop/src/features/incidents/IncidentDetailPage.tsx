import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { handledByOther, historyLabel } from "@pool-safety/shared";
import { api } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";
import { useResource } from "../../hooks/useResource";
import {
  PageHeader,
  StatusBadge,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Pagination,
  date,
  confidence,
} from "../../components/ui";
import { VideoStream } from "../../components/CameraCard";
import { IncidentActions } from "./IncidentActions";
export function IncidentDetailPage() {
  const { id = "" } = useParams();
  const user = useAuthStore((s) => s.user)!;
  const [historyPage, setHistoryPage] = useState(0);
  const incidentResource = useResource(() => api.incidents.get(id), [id]);
  const timelineResource = useResource(
    () => api.incidents.history(id, { page: historyPage, order: "asc" }),
    [id, historyPage],
  );
  const incident = incidentResource.data;
  const timeline = timelineResource.data;
  const eventType = incident?.detectionEvent.eventType.replaceAll("_", " ");
  return (
    <>
      <Link to="/incidents">← All incidents</Link>
      <PageHeader
        title={
          incident
            ? `${eventType} · ${incident.camera.name}`
            : "Incident detail"
        }
        description={incident?.camera.locationDescription || undefined}
      />
      {incidentResource.error && (
        <ErrorState
          message={incidentResource.error}
          onRetry={incidentResource.reload}
        />
      )}
      {incidentResource.loading && !incident && <LoadingSpinner />}
      {incident && (
        <div className="two-columns">
          <section className="panel">
            <h2>Incident evidence</h2>
            {incident.detectionEvent.snapshotUrl ? (
              <img
                className="snapshot"
                src={incident.detectionEvent.snapshotUrl}
                alt="Incident snapshot"
                onError={(e) => {
                  e.currentTarget.alt = "Snapshot unavailable";
                }}
              />
            ) : (
              <div className="state">No snapshot supplied</div>
            )}
            {incident.detectionEvent.videoUrl && (
              <>
                <h2>Recorded clip</h2>
                <VideoStream url={incident.detectionEvent.videoUrl} />
              </>
            )}
            <h2>Live camera</h2>
            <VideoStream
              url={
                incident.camera.status === "ONLINE"
                  ? incident.camera.streamUrl
                  : null
              }
            />
          </section>
          <section className="panel">
            <StatusBadge status={incident.status} />
            <dl className="details">
              <dt>Event type</dt>
              <dd>{eventType}</dd>
              <dt>Detected</dt>
              <dd>{date(incident.detectionEvent.detectedAt)}</dd>
              <dt>Confidence</dt>
              <dd>{confidence(incident.detectionEvent.confidence)}</dd>
              <dt>Camera</dt>
              <dd>
                <Link to={`/cameras/${incident.camera.id}`}>
                  {incident.camera.name}
                </Link>
              </dd>
              <dt>Location</dt>
              <dd>{incident.camera.locationDescription || "—"}</dd>
              <dt>Handled by</dt>
              <dd>{incident.handledBy?.fullName || "Unassigned"}</dd>
              <dt>Acknowledged</dt>
              <dd>{date(incident.acknowledgedAt)}</dd>
              <dt>Started</dt>
              <dd>{date(incident.startedAt)}</dd>
              <dt>Resolved</dt>
              <dd>{date(incident.resolvedAt)}</dd>
            </dl>
            {incident.resolutionNote && (
              <p className="note">{incident.resolutionNote}</p>
            )}
            {handledByOther(incident, user) && (
              <p className="connection-hint">
                Currently handled by {incident.handledBy!.fullName}
              </p>
            )}
            <IncidentActions incident={incident} />
            <h2>Timeline</h2>
            {timelineResource.error && (
              <ErrorState
                message={timelineResource.error}
                onRetry={timelineResource.reload}
              />
            )}
            <ol className="timeline">
              {timeline?.content.map((h) => (
                <li
                  key={h.id}
                  className={
                    h.action.startsWith("ADMIN_OVERRIDE") ? "override" : ""
                  }
                >
                  <strong>{historyLabel(h.action)}</strong>
                  <p>
                    {h.performedBy?.fullName || "AI service"} ·{" "}
                    {date(h.createdAt)}
                    {h.fromStatus && h.toStatus && (
                      <small>
                        {" "}
                        · {h.fromStatus} → {h.toStatus}
                      </small>
                    )}
                  </p>
                  {h.note && <small>{h.note}</small>}
                </li>
              ))}
            </ol>
            {timeline && !timeline.content.length && (
              <EmptyState message="No timeline entries yet" />
            )}
            {timeline && timeline.totalPages > 1 && (
              <Pagination
                page={historyPage}
                total={timeline.totalElements}
                totalPages={timeline.totalPages}
                change={setHistoryPage}
              />
            )}
          </section>
        </div>
      )}
    </>
  );
}
