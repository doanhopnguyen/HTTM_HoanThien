import { useState } from "react";
import { api } from "../../api/client";
import { useResource } from "../../hooks/useResource";
import {
  PageHeader,
  Select,
  LoadingSpinner,
  ErrorState,
  Table,
  StatusBadge,
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
  return (
    <>
      <PageHeader
        title="Reports"
        description="Incident trends and rescue outcomes"
      >
        <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={1}>Today</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </Select>
      </PageHeader>
      {resource.error && <ErrorState message={resource.error} />}
      {!resource.data && resource.loading && <LoadingSpinner />}
      {resource.data && (
        <>
          <div className="stat-grid">
            {[
              ["Incidents", resource.data[0].total],
              ["Resolved", resource.data[0].resolved],
              ["False alarms", resource.data[0].falseAlarms],
              [
                "Average handling",
                resource.data[0].averageHandlingSeconds === null
                  ? "—"
                  : `${Math.round(resource.data[0].averageHandlingSeconds / 60)} min`,
              ],
            ].map(([label, value]) => (
              <div className="stat-card" key={label}>
                <div>
                  <p>{label}</p>
                  <strong>{value}</strong>
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
            <Table headers={["Camera", "Status", "Incidents"]}>
              {resource.data[2].map((c) => (
                <tr key={c.cameraId}>
                  <td>{c.name}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{c.incidents}</td>
                </tr>
              ))}
            </Table>
          </section>
        </>
      )}
    </>
  );
}
