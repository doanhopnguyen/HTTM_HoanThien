import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TriangleAlert, X } from "lucide-react";
import { api } from "../../api/client";
import { useIncidentStore } from "../../stores/incidentStore";
import { Button, StatusBadge, confidence, date } from "../../components/ui";
import { IncidentActions } from "./IncidentActions";
/** Floating critical-alert panel (spec §32): unclaimed and in-progress incidents, newest first. */
export function ActiveIncidentPanel() {
  const alerts = useIncidentStore((s) => s.alerts);
  const dismiss = useIncidentStore((s) => s.dismiss);
  const navigate = useNavigate();
  useEffect(() => {
    // Incidents raised before this login are shown as well, not only realtime ones.
    void api.incidents
      .list({ status: "NEW", size: 5 })
      .then((page) => useIncidentStore.getState().seed(page.content))
      .catch(() => undefined);
  }, []);
  const alert = alerts[0];
  if (!alert) return null;
  return (
    <aside className="critical-alert" role="alert" aria-label="Active incident">
      <div className="section-heading">
        <strong>
          <TriangleAlert size={22} />{" "}
          {alert.detectionEvent.eventType.replaceAll("_", " ")} ALERT
        </strong>
        <Button
          variant="ghost"
          onClick={() => dismiss(alert.id)}
          aria-label="Dismiss alert"
        >
          <X size={18} />
        </Button>
      </div>
      <h3>{alert.camera.name}</h3>
      <p>{alert.camera.locationDescription}</p>
      <dl className="details compact">
        <dt>Detected</dt>
        <dd>{date(alert.detectionEvent.detectedAt)}</dd>
        <dt>Confidence</dt>
        <dd>{confidence(alert.detectionEvent.confidence)}</dd>
        <dt>Status</dt>
        <dd>
          <StatusBadge status={alert.status} />
        </dd>
      </dl>
      <p>
        {alert.handledBy
          ? `Handled by ${alert.handledBy.fullName}`
          : "Immediate attention required"}
      </p>
      <IncidentActions
        incident={alert}
        onDone={(updated) => useIncidentStore.getState().receive(updated)}
      />
      <div className="actions">
        <Button
          variant="ghost"
          onClick={() => navigate(`/monitor?camera=${alert.camera.id}`)}
        >
          View camera
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate(`/incidents/${alert.id}`)}
        >
          View detail
        </Button>
      </div>
      {alerts.length > 1 && (
        <small className="muted">
          +{alerts.length - 1} more active alert{alerts.length > 2 ? "s" : ""}
        </small>
      )}
    </aside>
  );
}
