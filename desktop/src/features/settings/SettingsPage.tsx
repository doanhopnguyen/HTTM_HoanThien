import { useState, type FormEvent } from "react";
import { api, baseUrl } from "../../api/client";
import { errorMessage } from "@pool-safety/shared";
import { useResource } from "../../hooks/useResource";
import { useUiStore } from "../../stores/uiStore";
import {
  Button,
  PageHeader,
  Field,
  Input,
  Table,
  Pagination,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  FilterBar,
  Select,
  date,
} from "../../components/ui";
const auditActions = [
  "LOGIN",
  "LOGOUT",
  "CHANGE_PASSWORD",
  "RESET_PASSWORD",
  "CREATE_USER",
  "UPDATE_USER",
  "DISABLE_USER",
  "ACTIVATE_USER",
  "CREATE_CAMERA",
  "UPDATE_CAMERA",
  "ENABLE_MONITORING",
  "DISABLE_MONITORING",
  "DISABLE_CAMERA",
  "DELETE_CAMERA",
  "ACKNOWLEDGE_INCIDENT",
  "START_INCIDENT",
  "RESOLVE_INCIDENT",
  "FALSE_ALARM",
  "ADMIN_OVERRIDE",
];
export function SettingsPage() {
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const capabilities = useResource(() => api.capabilities());
  const audit = useResource(
    () =>
      api.audit({
        page,
        action: action || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      }),
    [page, action, from, to],
  );
  async function password(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api.auth.changePassword(
        String(f.get("current")),
        String(f.get("password")),
      );
      useUiStore
        .getState()
        .notify("Password changed. Please sign in again.", "success");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Settings"
        description="Connection, account security and audit history"
      />
      <div className="two-columns">
        <section className="panel">
          <h2>System configuration</h2>
          <p>Backend: {baseUrl}</p>
          {capabilities.error && (
            <ErrorState
              message={capabilities.error}
              onRetry={capabilities.reload}
            />
          )}
          {capabilities.data && (
            <>
              <p>Pool timezone: {capabilities.data.timezone}</p>
              <p>
                Staff false alarm permission:{" "}
                {capabilities.data.staffFalseAlarm ? "Allowed" : "Admin only"}
              </p>
            </>
          )}
          <p className="muted">
            Server configuration is controlled by environment variables. Change
            the desktop connection from the sign-in screen.
          </p>
        </section>
        <section className="panel">
          <h2>Change password</h2>
          <form onSubmit={password}>
            <Field label="Current password">
              <Input
                name="current"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="New password">
              <Input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={72}
              />
            </Field>
            {error && <div className="error">{error}</div>}
            <Button disabled={busy}>Change password</Button>
          </form>
        </section>
      </div>
      <section className="panel">
        <h2>Audit history</h2>
        <FilterBar>
          <Select
            aria-label="Audit action"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All actions</option>
            {auditActions.map((a) => (
              <option key={a} value={a}>
                {a.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          <Input
            aria-label="Audit from"
            type="datetime-local"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
          <Input
            aria-label="Audit to"
            type="datetime-local"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
          />
        </FilterBar>
        {audit.error && (
          <ErrorState message={audit.error} onRetry={audit.reload} />
        )}
        {audit.loading && !audit.data && <LoadingSpinner />}
        {audit.data && (
          <>
            <Table
              headers={["Time", "User", "Action", "Entity", "Description"]}
            >
              {audit.data.content.map((a) => (
                <tr key={a.id}>
                  <td>{date(a.createdAt)}</td>
                  <td>{a.userFullName || a.username || "System"}</td>
                  <td>{a.action.replaceAll("_", " ")}</td>
                  <td>{a.entityType}</td>
                  <td>{a.description}</td>
                </tr>
              ))}
            </Table>
            {!audit.data.content.length && (
              <EmptyState message="No audit entries for these filters" />
            )}
            <Pagination
              page={page}
              total={audit.data.totalElements}
              totalPages={audit.data.totalPages}
              change={setPage}
            />
          </>
        )}
      </section>
    </>
  );
}
