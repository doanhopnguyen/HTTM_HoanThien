import { useState } from "react";
import { Link } from "react-router-dom";
import type { IncidentStatus } from "@pool-safety/shared";
import { api } from "../../api/client";
import { IncidentActions } from "./IncidentActions";
import { useResource } from "../../hooks/useResource";
import {
  PageHeader,
  Input,
  Select,
  FilterBar,
  StatusBadge,
  Table,
  Pagination,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  date,
  confidence,
} from "../../components/ui";
export function IncidentListPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [handledBy, setHandledBy] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filters = {
    page,
    status: (status || undefined) as IncidentStatus | undefined,
    cameraId: cameraId || undefined,
    handledBy: handledBy || undefined,
    search: search || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to).toISOString() : undefined,
  };
  const resource = useResource(
    () => api.incidents.list(filters),
    [page, status, cameraId, handledBy, search, from, to],
  );
  const options = useResource(() =>
    Promise.all([
      api.cameras.list({ size: 100 }),
      api.users.list({ size: 100 }),
    ]),
  );
  const change =
    (setter: (value: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(0);
    };
  return (
    <>
      <PageHeader
        title="Incidents"
        description="Review alerts, ownership and rescue outcomes"
      />
      <FilterBar>
        <Input
          aria-label="Search incidents"
          placeholder="Search camera or event…"
          value={search}
          onChange={change(setSearch)}
        />
        <Select aria-label="Status" value={status} onChange={change(setStatus)}>
          <option value="">All statuses</option>
          {[
            "NEW",
            "ACKNOWLEDGED",
            "IN_PROGRESS",
            "RESOLVED",
            "FALSE_ALARM",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select
          aria-label="Camera"
          value={cameraId}
          onChange={change(setCameraId)}
        >
          <option value="">All cameras</option>
          {options.data?.[0].content.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Handler"
          value={handledBy}
          onChange={change(setHandledBy)}
        >
          <option value="">All handlers</option>
          {options.data?.[1].content.map((u) => (
            <option value={u.id} key={u.id}>
              {u.fullName}
            </option>
          ))}
        </Select>
        <Input
          aria-label="From"
          type="datetime-local"
          value={from}
          onChange={change(setFrom)}
        />
        <Input
          aria-label="To"
          type="datetime-local"
          value={to}
          onChange={change(setTo)}
        />
      </FilterBar>
      {options.error && (
        <ErrorState
          message={`Filter options unavailable: ${options.error}`}
          onRetry={options.reload}
        />
      )}
      {resource.error && (
        <ErrorState message={resource.error} onRetry={resource.reload} />
      )}
      {resource.loading && !resource.data && <LoadingSpinner />}
      {resource.data && (
        <section className="panel">
          <Table
            headers={[
              "Detected",
              "Camera",
              "Event",
              "Confidence",
              "Status",
              "Handled by",
              "Resolved",
              "Actions",
            ]}
          >
            {resource.data.content.map((i) => (
              <tr key={i.id}>
                <td>{date(i.detectionEvent.detectedAt)}</td>
                <td>{i.camera.name}</td>
                <td>{i.detectionEvent.eventType.replaceAll("_", " ")}</td>
                <td>{confidence(i.detectionEvent.confidence)}</td>
                <td>
                  <StatusBadge status={i.status} />
                </td>
                <td>{i.handledBy?.fullName || "—"}</td>
                <td>{date(i.resolvedAt)}</td>
                <td>
                  <div className="actions">
                    <Link to={`/incidents/${i.id}`}>View</Link>
                    <IncidentActions incident={i} compact />
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          {!resource.data.content.length && <EmptyState />}
          <Pagination
            page={page}
            total={resource.data.totalElements}
            totalPages={resource.data.totalPages}
            change={setPage}
          />
        </section>
      )}
    </>
  );
}
