import { useState } from "react";
import { api } from "../../api/client";
import { useResource } from "../../hooks/useResource";
import {
  PageHeader,
  Select,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Table,
  StatusBadge,
  duration,
} from "../../components/ui";
import { IncidentChart } from "./IncidentChart";
export function ReportsPage() {
  const [days, setDays] = useState(7);
  const resource = useResource(
    () =>
      Promise.all([
        api.dashboard.report(days),
        api.dashboard.statistics(days),
        api.dashboard.cameras(days),
      ]),
    [days],
  );
  const report = resource.data?.[0];
  return (
    <>
      <PageHeader
        title="Reports"
        description="Incident trends and rescue outcomes"
      >
        <Select
          aria-label="Report period"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={1}>Today</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </Select>
      </PageHeader>
      {resource.error && (
        <ErrorState message={resource.error} onRetry={resource.reload} />
      )}
      {!resource.data && resource.loading && <LoadingSpinner />}
      {resource.data && report && (
        <>
          <div className="stat-grid">
            {[
              ["Incidents", report.total],
              ["Resolved", report.resolved],
              ["False alarms", report.falseAlarms],
              ["Still active", report.active],
            ].map(([label, value]) => (
              <div className="stat-card" key={label}>
                <div>
                  <p>{label}</p>
                  <strong>{value}</strong>
                </div>
              </div>
            ))}
          </div>
          <div className="stat-grid">
            {[
              [
                "Average response",
                duration(report.averageResponseSeconds),
                "Detection → acknowledged",
              ],
              [
                "Average handling",
                duration(report.averageHandlingSeconds),
                "Acknowledged → resolved",
              ],
              [
                "Average time to close",
                duration(report.averageResolutionSeconds),
                "Detection → resolved / false alarm",
              ],
            ].map(([label, value, hint]) => (
              <div className="stat-card" key={label}>
                <div>
                  <p>{label}</p>
                  <strong>{value}</strong>
                  <small className="muted">{hint}</small>
                </div>
              </div>
            ))}
          </div>
          <section className="panel">
            <h2>Incidents by day</h2>
            <IncidentChart data={resource.data[1]} />
          </section>
          <section className="panel">
            <h2>Incidents by camera</h2>
            <Table
              headers={[
                "Camera",
                "Status",
                "Incidents",
                "Resolved",
                "False alarms",
                "Active",
              ]}
            >
              {resource.data[2].map((c) => (
                <tr key={c.cameraId}>
                  <td>{c.name}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{c.incidents}</td>
                  <td>{c.resolved}</td>
                  <td>{c.falseAlarms}</td>
                  <td>{c.active}</td>
                </tr>
              ))}
            </Table>
            {!resource.data[2].length && (
              <EmptyState message="No cameras configured" />
            )}
          </section>
        </>
      )}
    </>
  );
}
