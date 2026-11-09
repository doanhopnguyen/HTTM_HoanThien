import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { errorMessage, type Role, type User } from "@pool-safety/shared";
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
  FilterBar,
  ConfirmDialog,
  Pagination,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  date,
} from "../../components/ui";
export function UsersPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [status, setStatus] = useState<User["status"] | "">("");
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [disabling, setDisabling] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const current = useAuthStore((s) => s.user)!;
  const resource = useResource(
    () =>
      api.users.list({
        page,
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
      }),
    [page, search, role, status],
  );
  async function setUserStatus(user: User, next: User["status"]) {
    setBusy(true);
    try {
      await api.users.status(user.id, next);
      useUiStore
        .getState()
        .notify(
          `${user.fullName} ${next === "ACTIVE" ? "activated" : "disabled"}`,
          "success",
        );
      setDisabling(null);
      useUiStore.getState().invalidate();
    } catch (e) {
      useUiStore.getState().notify(errorMessage(e), "error");
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
      <FilterBar>
        <Input
          aria-label="Search users"
          placeholder="Search name, username or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <Select
          aria-label="Role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | "");
            setPage(0);
          }}
        >
          <option value="">All roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="STAFF">STAFF</option>
        </Select>
        <Select
          aria-label="Account status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as User["status"] | "");
            setPage(0);
          }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="DISABLED">DISABLED</option>
        </Select>
      </FilterBar>
      {resource.error && (
        <ErrorState message={resource.error} onRetry={resource.reload} />
      )}
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
                      disabled={u.id === current.id}
                      title={
                        u.id === current.id
                          ? "Use Settings → Change password for your own account"
                          : undefined
                      }
                      onClick={() => setResetting(u)}
                    >
                      Reset password
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy || u.id === current.id}
                      onClick={() =>
                        u.status === "ACTIVE"
                          ? setDisabling(u)
                          : void setUserStatus(u, "ACTIVE")
                      }
                    >
                      {u.status === "ACTIVE" ? "Disable" : "Activate"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          {!resource.data.content.length && (
            <EmptyState message="No users match these filters" />
          )}
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
      {resetting && (
        <ResetPasswordForm user={resetting} close={() => setResetting(null)} />
      )}
      {disabling && (
        <ConfirmDialog
          title="Disable account"
          message={`${disabling.fullName} will be signed out on every device and can no longer log in until the account is activated again.`}
          confirmLabel="Disable account"
          busy={busy}
          close={() => setDisabling(null)}
          confirm={() => void setUserStatus(disabling, "DISABLED")}
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
    const text = (name: string) => String(f.get(name) ?? "");
    const body = {
      fullName: text("fullName"),
      email: text("email"),
      role: text("role") as Role,
      ...(!user
        ? { username: text("username"), password: text("password") }
        : {}),
    };
    try {
      if (user) await api.users.update(user.id, body);
      else await api.users.create(body);
      useUiStore
        .getState()
        .notify(user ? "User updated" : "User created", "success");
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
            <option value="STAFF">STAFF</option>
            <option value="ADMIN">ADMIN</option>
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
function ResetPasswordForm({ user, close }: { user: User; close: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password !== String(f.get("confirm"))) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.users.resetPassword(user.id, password);
      useUiStore
        .getState()
        .notify(`Password reset for ${user.fullName}`, "success");
      close();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`Reset password · ${user.fullName}`}
      close={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={submit}>
        <p className="muted">
          The user is signed out on every device and must log in with the new
          password.
        </p>
        <Field label="New password">
          <Input
            name="password"
            type="password"
            required
            minLength={10}
            maxLength={72}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm password">
          <Input
            name="confirm"
            type="password"
            required
            minLength={10}
            maxLength={72}
            autoComplete="new-password"
          />
        </Field>
        {error && <div className="error">{error}</div>}
        <Button disabled={busy}>Reset password</Button>
      </form>
    </Modal>
  );
}
