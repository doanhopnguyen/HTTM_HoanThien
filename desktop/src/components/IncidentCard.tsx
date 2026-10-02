import { Link } from "react-router-dom";
import type { Incident } from "@pool-safety/shared";
import { StatusBadge, date } from "./ui";
export function IncidentCard({ incident }: { incident: Incident }) {
  return (
    <Link
      className={`incident-card ${incident.status === "NEW" ? "critical-card" : ""}`}
      to={`/incidents/${incident.id}`}
    >
      <div>
        <strong>
          {incident.detectionEvent.eventType.replaceAll("_", " ")} ALERT
        </strong>
        <StatusBadge status={incident.status} />
      </div>
      <h3>{incident.camera.name}</h3>
      <p>{incident.camera.locationDescription}</p>
      <small>
        {date(incident.detectionEvent.detectedAt)} · Confidence{" "}
        {incident.detectionEvent.confidence === null
          ? "—"
          : `${Math.round(incident.detectionEvent.confidence * 100)}%`}
      </small>
      <p>
        {incident.handledBy
          ? `Handled by ${incident.handledBy.fullName}`
          : "Waiting for a lifeguard"}
      </p>
    </Link>
  );
}
