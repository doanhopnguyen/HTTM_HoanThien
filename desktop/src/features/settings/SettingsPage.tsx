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
  date,
} from "../../components/ui";
export function SettingsPage() {
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const resource = useResource(
    () => Promise.all([api.capabilities(), api.audit({ page })]),
    [page],
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
      useUiStore.getState().notify("Password changed. Please sign in again.");
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
          {resource.data && (
            <>
              <p>Pool timezone: {resource.data[0].timezone}</p>
              <p>
                Staff false alarm permission:{" "}
                {resource.data[0].staffFalseAlarm ? "Allowed" : "Admin only"}
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
        {resource.error && <ErrorState message={resource.error} />}
        {resource.loading && !resource.data && <LoadingSpinner />}
        {resource.data && (
          <>
            <Table headers={["Time", "Action", "Description"]}>
              {resource.data[1].content.map((a) => (
                <tr key={a.id}>
                  <td>{date(a.createdAt)}</td>
                  <td>{a.action}</td>
                  <td>{a.description}</td>
                </tr>
              ))}
            </Table>
            <Pagination
              page={page}
              total={resource.data[1].totalElements}
              totalPages={resource.data[1].totalPages}
              change={setPage}
            />
          </>
        )}
      </section>
    </>
  );
}
