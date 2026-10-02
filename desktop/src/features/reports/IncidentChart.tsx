import type { DayStatistic } from "@pool-safety/shared";
import { EmptyState } from "../../components/ui";
export function IncidentChart({ data }: { data: DayStatistic[] }) {
  if (!data.length)
    return <EmptyState message="No incident data for this period" />;
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="chart" role="img" aria-label="Incidents by day">
      {data.map((day) => (
        <div className="chart-column" key={day.date}>
          <span>{day.total}</span>
          <div
            className="chart-bar"
            style={{ height: `${Math.max(3, (day.total / max) * 140)}px` }}
            title={`${day.date}: ${day.total} incidents, ${day.resolved} resolved, ${day.falseAlarms} false alarms`}
          />
          <small>{day.date.slice(5)}</small>
        </div>
      ))}
    </div>
  );
}
