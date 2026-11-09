import { useState, type FormEvent } from "react";
import { Plus, Pencil } from "lucide-react";
import {
  errorMessage,
  type Camera,
  type CameraInput,
  type CameraStatus,
} from "@pool-safety/shared";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useResource } from "../../hooks/useResource";
import { useUiStore } from "../../stores/uiStore";
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
} from "../../components/ui";
export function CamerasPage() {
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Camera | "new" | null>(null);
  const [deleting, setDeleting] = useState<Camera | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CameraStatus | "">("");
  const resource = useResource(
    () =>
      api.cameras.list({
        page,
        search: search || undefined,
        status: status || undefined,
      }),
    [page, search, status],
  );
  async function act(work: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await work();
      useUiStore.getState().notify(done, "success");
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
        title="Cameras"
        description="Configure cameras and control monitoring"
      >
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} /> Add camera
        </Button>
      </PageHeader>
      <FilterBar>
        <Input
          aria-label="Search cameras"
          placeholder="Search code, name or location…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <Select
          aria-label="Camera status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as CameraStatus | "");
            setPage(0);
          }}
        >
          <option value="">All statuses</option>
          {["ONLINE", "OFFLINE", "DISABLED"].map((s) => (
            <option key={s}>{s}</option>
          ))}
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
              "Code",
              "Camera / Location",
              "Status",
              "Monitoring",
              "Source",
              "Actions",
            ]}
          >
            {resource.data.content.map((c) => (
              <tr key={c.id}>
                <td>{c.code}</td>
                <td>
                  <Link to={`/cameras/${c.id}`}>
                    <strong>{c.name}</strong>
                  </Link>
                  <small>{c.locationDescription}</small>
                </td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
                <td>
                  <Button
                    variant="ghost"
                    disabled={busy || c.status === "DISABLED"}
                    onClick={() =>
                      void act(
                        () =>
                          api.cameras.monitoring(c.id, !c.monitoringEnabled),
                        c.monitoringEnabled
                          ? `Monitoring paused: ${c.name}`
                          : `Monitoring enabled: ${c.name}`,
                      )
                    }
                  >
                    {c.monitoringEnabled
                      ? "Pause monitoring"
                      : "Enable monitoring"}
                  </Button>
                </td>
                <td className="truncate">
                  {c.streamUrlMasked || "Not configured"}
                </td>
                <td>
                  <div className="actions">
                    <Button
                      aria-label={`Edit ${c.name}`}
                      variant="ghost"
                      onClick={() => setEditing(c)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          () =>
                            api.cameras.status(
                              c.id,
                              c.status === "DISABLED" ? "OFFLINE" : "DISABLED",
                            ),
                          c.status === "DISABLED"
                            ? `Camera activated (offline): ${c.name}`
                            : `Camera disabled: ${c.name}`,
                        )
                      }
                    >
                      {c.status === "DISABLED" ? "Activate" : "Disable"}
                    </Button>
                    <Button
                      variant="danger-outline"
                      disabled={busy}
                      onClick={() => setDeleting(c)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          {!resource.data.content.length && (
            <EmptyState
              message={
                search || status
                  ? "No cameras match these filters"
                  : "No cameras configured. Add your first camera."
              }
            />
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
        <CameraForm
          camera={editing === "new" ? null : editing}
          close={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete camera"
          message="Camera history will be preserved by disabling any camera that already has detections. Unused cameras will be removed."
          busy={busy}
          close={() => setDeleting(null)}
          confirm={() =>
            void act(async () => {
              await api.cameras.remove(deleting.id);
              setDeleting(null);
            }, `Camera removed or disabled: ${deleting.name}`)
          }
        />
      )}
    </>
  );
}
function CameraForm({
  camera,
  close,
}: {
  camera: Camera | null;
  close: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clearStream, setClearStream] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const text = (name: string) => String(f.get(name) ?? "");
    const streamUrl = clearStream ? "" : text("streamUrl");
    // On edit an empty field keeps the stored source unless "remove" is ticked.
    const body: CameraInput = {
      code: text("code"),
      name: text("name"),
      locationDescription: text("locationDescription"),
      status: text("status") as CameraStatus,
      monitoringEnabled: f.get("monitoring") === "on",
      ...(streamUrl || !camera || clearStream ? { streamUrl } : {}),
    };
    try {
      if (camera) await api.cameras.update(camera.id, body);
      else await api.cameras.create(body);
      useUiStore
        .getState()
        .notify(camera ? "Camera updated" : "Camera created", "success");
      useUiStore.getState().invalidate();
      close();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={camera ? "Edit camera" : "Add camera"}
      close={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={submit}>
        <Field label="Code">
          <Input
            name="code"
            defaultValue={camera?.code}
            required
            pattern="[A-Za-z0-9_-]{1,100}"
          />
        </Field>
        <Field label="Name">
          <Input
            name="name"
            defaultValue={camera?.name}
            required
            maxLength={255}
          />
        </Field>
        <Field label="Location">
          <Input
            name="locationDescription"
            defaultValue={camera?.locationDescription || ""}
            maxLength={255}
          />
        </Field>
        <Field label="Stream URL">
          <Input
            name="streamUrl"
            defaultValue=""
            placeholder={
              camera
                ? "Leave blank to keep the existing source"
                : "https://gateway.example/camera.m3u8"
            }
            maxLength={2048}
            disabled={clearStream}
          />
        </Field>
        {camera?.streamUrlMasked && (
          <label className="check-inline">
            <input
              type="checkbox"
              checked={clearStream}
              onChange={(e) => setClearStream(e.target.checked)}
            />
            Remove the current source ({camera.streamUrlMasked})
          </label>
        )}
        <small className="muted">
          HLS/MP4 streams play in both apps. Send RTSP through a media gateway.
          Embedded credentials are kept on the backend.
        </small>
        <Field label="Status">
          <Select name="status" defaultValue={camera?.status || "OFFLINE"}>
            {["ONLINE", "OFFLINE", "DISABLED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <label className="checkbox">
          <input
            type="checkbox"
            name="monitoring"
            defaultChecked={camera?.monitoringEnabled ?? true}
          />{" "}
          Enable monitoring
        </label>
        {error && <div className="error">{error}</div>}
        <Button disabled={busy}>Save camera</Button>
      </form>
    </Modal>
  );
}
