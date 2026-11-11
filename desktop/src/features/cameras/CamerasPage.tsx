import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, Pencil, FolderOpen } from "lucide-react";
import {
  errorMessage,
  type Camera,
  type CameraInput,
  type CameraStatus,
  type AiModel,
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
  const [focusModel, setFocusModel] = useState(false);
  const [deleting, setDeleting] = useState<Camera | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CameraStatus | "">("");
  const aiRuntime = useResource(() => api.cameras.aiStatus(), []);
  useEffect(() => {
    const timer = setInterval(aiRuntime.reload, 5000);
    return () => clearInterval(timer);
  }, [aiRuntime.reload]);
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
        <Button
          onClick={() => {
            setFocusModel(false);
            setEditing("new");
          }}
        >
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
              "AI model",
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
                  {c.sourceType === "LOCAL_VIDEO"
                    ? "Video trên máy"
                    : c.streamUrlMasked || "Not configured"}
                </td>
                <td>
                  <strong>{c.aiModel || "NONE"}</strong>
                  <small>
                    {c.aiModel && c.aiModel !== "NONE"
                      ? (() => {
                          const s = aiRuntime.data?.find(
                            (s) => s.cameraId === c.id,
                          );
                          return !c.monitoringEnabled || c.status !== "ONLINE"
                            ? "Monitoring paused"
                            : s
                              ? `${s.state}: ${s.message} (${s.frames} frames)`
                              : "Chờ AI worker";
                        })()
                      : "Không dùng AI"}
                  </small>
                </td>
                <td>
                  <div className="actions">
                    <Button
                      aria-label={`Edit ${c.name}`}
                      variant="ghost"
                      onClick={() => {
                        setFocusModel(false);
                        setEditing(c);
                      }}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={`Chọn mô hình cho ${c.name}`}
                      onClick={() => {
                        setFocusModel(true);
                        setEditing(c);
                      }}
                    >
                      <FolderOpen size={16} /> Chọn mô hình
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
          focusModel={focusModel}
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
  focusModel,
  close,
}: {
  camera: Camera | null;
  focusModel: boolean;
  close: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clearStream, setClearStream] = useState(false);
  const [sourceType, setSourceType] = useState(camera?.sourceType || "STREAM");
  const [video, setVideo] = useState<File | null>(null);
  const [checkpoint, setCheckpoint] = useState<File | null>(null);
  const [aiModel, setAiModel] = useState<AiModel>(camera?.aiModel || "NONE");
  const [progress, setProgress] = useState("");
  const checkpointInput = useRef<HTMLInputElement>(null);
  const modelSection = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusModel) modelSection.current?.scrollIntoView({ block: "center" });
  }, [focusModel]);
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
      aiModel,
      aiConfidence: Number(text("aiConfidence")),
      ...(streamUrl || !camera || clearStream ? { streamUrl } : {}),
    };
    try {
      if (sourceType === "LOCAL_VIDEO" && !clearStream) {
        if (video) {
          setProgress("Đang tải video lên backend…");
          const asset = await api.cameras.uploadVideo(video);
          body.streamUrl = `local-video:${asset.id}`;
        } else if (camera?.sourceType === "LOCAL_VIDEO") delete body.streamUrl;
        else throw new Error("Chọn video trên máy trước khi lưu camera.");
      }
      if (
        sourceType === "STREAM" &&
        camera?.sourceType === "LOCAL_VIDEO" &&
        !streamUrl &&
        !clearStream
      )
        throw new Error("Nhập URL nguồn mới hoặc chọn xóa nguồn hiện tại.");
      if (aiModel === "NONE") body.modelAsset = "";
      else if (checkpoint) {
        setProgress("Đang tải checkpoint AI…");
        body.modelAsset = (await api.cameras.uploadModel(checkpoint)).id;
      } else if (
        aiModel !== "YOLO26N" &&
        !(camera?.aiModel === aiModel && camera.modelAsset)
      )
        throw new Error("Chọn file checkpoint cho mô hình AI.");
      else if (aiModel === "YOLO26N" && camera?.aiModel !== aiModel)
        body.modelAsset = "";
      setProgress("Đang lưu camera…");
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
        <Field label="Loại nguồn video">
          <Select
            value={sourceType}
            disabled={busy}
            onChange={(e) => {
              setSourceType(e.target.value as "STREAM" | "LOCAL_VIDEO");
              setClearStream(false);
            }}
          >
            <option value="STREAM">Camera / URL HTTP(S), RTSP</option>
            <option value="LOCAL_VIDEO">Video trên máy tính</option>
          </Select>
        </Field>
        {sourceType === "STREAM" && (
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
        )}
        {sourceType === "LOCAL_VIDEO" && (
          <>
            <Field label="Chọn video trên máy">
              <Input
                type="file"
                accept=".mp4,.webm,.mov"
                disabled={busy || clearStream}
                onChange={(e) => setVideo(e.target.files?.[0] || null)}
              />
            </Field>
            <small className="muted">
              {video?.name ||
                (camera?.sourceType === "LOCAL_VIDEO"
                  ? "Giữ video đã tải lên nếu không chọn file mới."
                  : "MP4 H.264 được khuyến nghị. Tối đa 1 GB; video được lưu trên máy backend.")}
            </small>
          </>
        )}
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
        {sourceType === "STREAM" && (
          <small className="muted">
            HLS/MP4 streams play in both apps. Send RTSP through a media
            gateway. Embedded credentials are kept on the backend.
          </small>
        )}
        <div ref={modelSection}>
          <Field label="Mô hình AI cho camera">
            <Select
              value={aiModel}
              disabled={busy}
              onChange={(e) => {
                setAiModel(e.target.value as AiModel);
                setCheckpoint(null);
              }}
            >
              <option value="NONE">Không dùng AI</option>
              <option value="YOLO26N">YOLO26n</option>
              <option value="ULTRALYTICS">
                YOLO đã huấn luyện (.pt / .onnx)
              </option>
              <option value="REFERENCE">
                Drowning Detection / INO / ConvLSTM
              </option>
            </Select>
          </Field>
          <input
            ref={checkpointInput}
            type="file"
            hidden
            aria-label="File mô hình đã huấn luyện"
            accept={aiModel === "ULTRALYTICS" ? ".pt,.onnx" : ".pt,.pth,.onnx"}
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setCheckpoint(file);
              e.currentTarget.value = "";
              if (aiModel === "NONE") setAiModel("ULTRALYTICS");
            }}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => checkpointInput.current?.click()}
          >
            <FolderOpen size={16} /> Chọn mô hình đã huấn luyện
          </Button>
          <small className="muted">
            {checkpoint?.name ||
              (camera?.aiModel === aiModel && camera.modelAsset
                ? `Đang dùng: ${camera.modelAsset}`
                : aiModel === "YOLO26N"
                  ? "Dùng yolo26n.pt mặc định nếu không chọn checkpoint. Mô hình mặc định không phân loại đuối nước."
                  : "Chọn file .pt, .pth hoặc .onnx đã huấn luyện trên máy tính.")}
          </small>
        </div>
        {aiModel === "REFERENCE" && (
          <small className="muted">
            Dùng bộ nạp của Desktop_Drowning_Detection; cần cấu hình
            REFERENCE_PROJECT khi chạy AI worker.
          </small>
        )}
        <Field label="Ngưỡng tin cậy AI (0.05–1)">
          <Input
            name="aiConfidence"
            type="number"
            min="0.05"
            max="1"
            step="0.01"
            defaultValue={camera?.aiConfidence ?? 0.5}
            required
            disabled={busy}
          />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={camera?.status || "ONLINE"}>
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
        <Button disabled={busy}>
          {busy ? progress || "Đang chuẩn bị…" : "Save camera"}
        </Button>
      </form>
    </Modal>
  );
}
