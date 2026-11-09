import { useState } from "react";
import {
  actionLabels,
  errorMessage,
  handledByOther,
  incidentActions,
  noteActions,
  type Incident,
  type IncidentAction,
} from "@pool-safety/shared";
import { api } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import { useCapabilities } from "../../hooks/useCapabilities";
import { Button, Field, Modal } from "../../components/ui";
/**
 * Action buttons for an incident. The backend decides every transition; the list here only
 * mirrors its rules. Resolve and false alarm ask for a note; administrator overrides are labelled.
 */
export function IncidentActions({
  incident,
  compact = false,
  onDone,
}: {
  incident: Incident;
  compact?: boolean;
  onDone?: (updated: Incident) => void;
}) {
  const user = useAuthStore((s) => s.user)!;
  const capabilities = useCapabilities();
  const [pending, setPending] = useState<IncidentAction | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const override = handledByOther(incident, user);
  const actions = incidentActions(
    incident,
    user,
    capabilities?.staffFalseAlarm ?? false,
  );
  async function run(action: IncidentAction, text?: string) {
    setBusy(true);
    setError("");
    try {
      const updated = await api.incidents.action(incident.id, action, text);
      setPending(null);
      useUiStore
        .getState()
        .notify(`${actionLabels[action]}: ${incident.camera.name}`, "success");
      useUiStore.getState().invalidate();
      onDone?.(updated);
    } catch (e) {
      const message = errorMessage(e);
      if (pending) setError(message);
      else useUiStore.getState().notify(message, "error");
      useUiStore.getState().invalidate();
    } finally {
      setBusy(false);
    }
  }
  if (!actions.length) return null;
  return (
    <>
      <div className="actions">
        {actions.map((action) => (
          <Button
            key={action}
            className={compact ? "small" : ""}
            variant={
              action === "false-alarm"
                ? "ghost"
                : action === "acknowledge"
                  ? "danger"
                  : "primary"
            }
            disabled={busy}
            onClick={() => {
              if (noteActions.includes(action)) {
                setNote("");
                setError("");
                setPending(action);
              } else void run(action);
            }}
          >
            {override
              ? `Override: ${actionLabels[action]}`
              : actionLabels[action]}
          </Button>
        ))}
      </div>
      {pending && (
        <Modal
          title={`${actionLabels[pending]} · ${incident.camera.name}`}
          close={() => {
            if (!busy) setPending(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(pending, note);
            }}
          >
            {override && incident.handledBy && (
              <p className="connection-hint">
                {incident.handledBy.fullName} is handling this incident. Your
                action is recorded as an administrator override and they are
                notified.
              </p>
            )}
            <Field
              label={
                pending === "resolve" ? "Resolution note" : "False alarm reason"
              }
            >
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                maxLength={5000}
                rows={4}
                autoFocus
              />
            </Field>
            {error && <div className="error">{error}</div>}
            <Button disabled={busy || !note.trim()} type="submit">
              Confirm {actionLabels[pending].toLowerCase()}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
