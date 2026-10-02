import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { errorMessage, type User } from "@pool-safety/shared";
import { api } from "../../api/client";
import { useResource } from "../../hooks/useResource";
import { useUiStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";
import {
  Button,
  PageHeader,
  Table,
  StatusBadge,
  Modal,
  Field,
  Input,
  Select,
  Pagination,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  date,
} from "../../components/ui";
export function UsersPage() {
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const current = useAuthStore((s) => s.user)!;
  const resource = useResource(() => api.users.list({ page }), [page]);
  async function toggle(user: User) {
    setBusy(true);
    try {
      await api.users.status(
        user.id,
        user.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
      );
      useUiStore.getState().invalidate();
    } catch (e) {
      useUiStore.getState().notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Users"
        description="Administrator and lifeguard accounts"
      >
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} /> Add user
        </Button>
      </PageHeader>
      {resource.error && <ErrorState message={resource.error} />}
      {resource.loading && !resource.data && <LoadingSpinner />}
      {resource.data && (
        <section className="panel">
          <Table
            headers={[
              "Full name",
              "Username",
              "Email",
              "Role",
              "Status",
              "Created",
              "Actions",
            ]}
          >
            {resource.data.content.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  <StatusBadge status={u.status} />
                </td>
                <td>{date(u.createdAt)}</td>
                <td>
                  <div className="actions">
                    <Button variant="ghost" onClick={() => setEditing(u)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy || u.id === current.id}
                      onClick={() => void toggle(u)}
                    >
                      {u.status === "ACTIVE" ? "Disable" : "Activate"}
                    </Button>
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
      {editing && (
        <UserForm
          user={editing === "new" ? null : editing}
          close={() => setEditing(null)}
        />
      )}
    </>
  );
}
function UserForm({ user, close }: { user: User | null; close: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const body = {
      fullName: f.get("fullName"),
      email: f.get("email"),
      role: f.get("role"),
      ...(!user
        ? { username: f.get("username"), password: f.get("password") }
        : {}),
    };
    try {
      if (user) await api.users.update(user.id, body);
      else await api.users.create(body);
      close();
      useUiStore.getState().invalidate();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={user ? "Edit user" : "Add user"}
      close={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={submit}>
        <Field label="Full name">
          <Input
            name="fullName"
            required
            defaultValue={user?.fullName}
            maxLength={150}
          />
        </Field>
        {!user && (
          <Field label="Username">
            <Input name="username" required pattern="[A-Za-z0-9_.-]{3,100}" />
          </Field>
        )}
        <Field label="Email">
          <Input
            name="email"
            type="email"
            required
            defaultValue={user?.email}
            maxLength={255}
          />
        </Field>
        <Field label="Role">
          <Select name="role" defaultValue={user?.role || "STAFF"}>
            <option>STAFF</option>
            <option>ADMIN</option>
          </Select>
        </Field>
        {!user && (
          <Field label="Initial password">
            <Input
              name="password"
              type="password"
              required
              minLength={10}
              maxLength={72}
              autoComplete="new-password"
            />
          </Field>
        )}
        {error && <div className="error">{error}</div>}
        <Button disabled={busy}>Save user</Button>
      </form>
    </Modal>
  );
}
