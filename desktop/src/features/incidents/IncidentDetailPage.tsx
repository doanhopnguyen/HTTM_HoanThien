import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  actionLabels,
  incidentActions,
  errorMessage,
  type IncidentAction,
} from "@pool-safety/shared";
import { api } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import { useResource } from "../../hooks/useResource";
import {
  PageHeader,
  Button,
  StatusBadge,
  LoadingSpinner,
  ErrorState,
  Modal,
  Field,
  Pagination,
  date,
} from "../../components/ui";
import { VideoStream } from "../../components/CameraCard";
export function IncidentDetailPage() {
  const { id = "" } = useParams();
  const user = useAuthStore((s) => s.user)!;
  const [historyPage, setHistoryPage] = useState(0);
  const [action, setAction] = useState<IncidentAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const resource = useResource(
    () =>
      Promise.all([
        api.incidents.get(id),
        api.incidents.history(id, { page: historyPage }),
        api.capabilities(),
      ]),
    [id, historyPage],
  );
  async function perform(selected: IncidentAction) {
    if (selected === "resolve" || selected === "false-alarm") {
      setAction(selected);
      setNote("");
      setError("");
      return;
    }
    await submit(selected);
  }
  async function submit(selected: IncidentAction) {
    setBusy(true);
    setError("");
    try {
      await api.incidents.action(id, selected, note);
      setAction(null);
      useUiStore.getState().invalidate();
      useUiStore.getState().notify("Incident updated");
    } catch (e) {
      setError(errorMessage(e));
      useUiStore.getState().invalidate();
    } finally {
      setBusy(false);
    }
  }
  const incident = resource.data?.[0];
  const timeline = resource.data?.[1];
  return (
    <>
      <Link to="/incidents">← All incidents</Link>
      <PageHeader
        title={
          incident
            ? `${incident.detectionEvent.eventType} · ${incident.camera.name}`
            : "Incident detail"
        }
        description={incident?.camera.locationDescription || undefined}
      />
      {resource.error && <ErrorState message={resource.error} />}
      {resource.loading && !incident && <LoadingSpinner />}
      {incident && (
        <>
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
                <VideoStream url={incident.detectionEvent.videoUrl} />
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
                <dt>Detected</dt>
                <dd>{date(incident.detectionEvent.detectedAt)}</dd>
                <dt>Confidence</dt>
                <dd>
                  {incident.detectionEvent.confidence === null
                    ? "—"
                    : `${Math.round(incident.detectionEvent.confidence * 100)}%`}
                </dd>
                <dt>Camera</dt>
                <dd>{incident.camera.name}</dd>
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
              {incident.handledBy && incident.handledBy.id !== user.id && (
                <p className="connection-hint">
                  Currently handled by {incident.handledBy.fullName}
                </p>
              )}
              <div className="actions">
                {incidentActions(
                  incident,
                  user,
                  resource.data![2].staffFalseAlarm,
                ).map((a) => (
                  <Button
                    key={a}
                    variant={a === "false-alarm" ? "ghost" : "primary"}
                    disabled={busy}
                    onClick={() => void perform(a)}
                  >
                    {actionLabels[a]}
                  </Button>
                ))}
              </div>
              {error && !action && <ErrorState message={error} />}
              <h2>Timeline</h2>
              <ol className="timeline">
                {timeline?.content
                  .slice()
                  .reverse()
                  .map((h) => (
                    <li key={h.id}>
                      <strong>{h.action.replaceAll("_", " ")}</strong>
                      <p>
                        {h.performedBy?.fullName || "AI service"} ·{" "}
                        {date(h.createdAt)}
                      </p>
                      {h.note && <small>{h.note}</small>}
                    </li>
                  ))}
              </ol>
              {timeline && (
                <Pagination
                  page={historyPage}
                  total={timeline.totalElements}
                  totalPages={timeline.totalPages}
                  change={setHistoryPage}
                />
              )}
            </section>
          </div>
        </>
      )}
      {action && (
        <Modal
          title={actionLabels[action]}
          close={() => {
            if (!busy) setAction(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(action);
            }}
          >
            <Field label="Resolution note">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                maxLength={5000}
                rows={4}
              />
            </Field>
            {error && <div className="error">{error}</div>}
            <Button disabled={busy} type="submit">
              Confirm {actionLabels[action].toLowerCase()}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
