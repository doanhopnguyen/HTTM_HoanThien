import { useState } from "react";
import { Image, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  actionLabels,
  errorMessage,
  handledByOther,
  historyLabel,
  incidentActions,
  noteActions,
  type IncidentAction,
} from "@pool-safety/shared";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../api/client";
import { useResource } from "../../hooks/useResource";
import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import {
  Screen,
  styles,
  Loading,
  ErrorState,
  EmptyState,
  Button,
  StatusBadge,
  Pagination,
  DetailRow,
  ConfirmDialog,
  date,
  confidence,
  words,
} from "../../components/ui";
import { VideoStream } from "../../components/VideoStream";
const confirmMessages: Partial<Record<IncidentAction, string>> = {
  acknowledge:
    "You take responsibility for this incident. Other lifeguards will see you as the handler.",
  start: "Confirm that you are now handling the incident on site.",
};
export function IncidentDetailScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "IncidentDetail">) {
  const { id } = route.params;
  const user = useAuthStore((s) => s.user)!;
  const [page, setPage] = useState(0);
  const [action, setAction] = useState<IncidentAction | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [snapshotError, setSnapshotError] = useState(false);
  const incidentResource = useResource(
    () => Promise.all([api.incidents.get(id), api.capabilities()]),
    [id],
  );
  const timelineResource = useResource(
    () => api.incidents.history(id, { page, order: "asc" }),
    [id, page],
  );
  async function submit(selected: IncidentAction) {
    setBusy(true);
    setError("");
    try {
      await api.incidents.action(
        id,
        selected,
        noteActions.includes(selected) ? note : undefined,
      );
      setAction(null);
      useUiStore.getState().notify(`${actionLabels[selected]} done`, "success");
      useUiStore.getState().invalidate();
    } catch (e) {
      setError(errorMessage(e));
      useUiStore.getState().invalidate();
    } finally {
      setBusy(false);
    }
  }
  const incident = incidentResource.data?.[0];
  const capabilities = incidentResource.data?.[1];
  const timeline = timelineResource.data;
  const actions =
    incident && capabilities
      ? incidentActions(incident, user, capabilities.staffFalseAlarm)
      : [];
  const closed =
    incident?.status === "RESOLVED" || incident?.status === "FALSE_ALARM";
  return (
    <Screen>
      {incidentResource.error && (
        <ErrorState
          message={incidentResource.error}
          onRetry={incidentResource.reload}
        />
      )}
      {incidentResource.loading && !incident && <Loading />}
      {incident && (
        <>
          <Text style={styles.title}>
            {words(incident.detectionEvent.eventType)} alert
          </Text>
          <StatusBadge status={incident.status} />
          <Text style={[styles.heading, { marginTop: 20 }]}>
            {incident.camera.name}
          </Text>
          <Text style={styles.subtitle}>
            {incident.camera.locationDescription}
          </Text>
          {incident.detectionEvent.snapshotUrl && !snapshotError ? (
            <Image
              source={{ uri: incident.detectionEvent.snapshotUrl }}
              accessibilityLabel="Incident snapshot"
              style={{
                width: "100%",
                height: 220,
                borderRadius: 12,
                marginBottom: 18,
              }}
              resizeMode="contain"
              onError={() => setSnapshotError(true)}
            />
          ) : (
            <Text style={[styles.muted, { marginBottom: 12 }]}>
              No snapshot available
            </Text>
          )}
          {incident.detectionEvent.videoUrl && (
            <VideoStream url={incident.detectionEvent.videoUrl} />
          )}
          <View style={styles.card}>
            <DetailRow label="Camera" value={incident.camera.name} />
            <DetailRow
              label="Location"
              value={incident.camera.locationDescription || "—"}
            />
            <DetailRow
              label="Detected at"
              value={date(incident.detectionEvent.detectedAt)}
            />
            <DetailRow
              label="Confidence"
              value={confidence(incident.detectionEvent.confidence)}
            />
            <DetailRow
              label="Status"
              value={<StatusBadge status={incident.status} />}
            />
            <DetailRow
              label="Handled by"
              value={incident.handledBy?.fullName || "Unassigned"}
            />
            {incident.resolutionNote && (
              <DetailRow label="Resolution" value={incident.resolutionNote} />
            )}
          </View>
          {handledByOther(incident, user) && (
            <Text style={styles.subtitle}>
              Currently handled by {incident.handledBy!.fullName}
            </Text>
          )}
          {error && !action && (
            <ErrorState message={error} onRetry={incidentResource.reload} />
          )}
          {actions.map((a) => (
            <Button
              key={a}
              label={actionLabels[a]}
              disabled={busy}
              danger={a === "acknowledge"}
              secondary={a === "false-alarm"}
              onPress={() => {
                setError("");
                setNote("");
                setAction(a);
              }}
            />
          ))}
          {!actions.length && (
            <Text style={[styles.muted, { textAlign: "center" }]}>
              {closed
                ? "No action · incident closed"
                : "No action available to you"}
            </Text>
          )}
          <Text style={[styles.heading, { marginTop: 25 }]}>Timeline</Text>
          {timelineResource.error && (
            <ErrorState
              message={timelineResource.error}
              onRetry={timelineResource.reload}
            />
          )}
          {timeline?.content.map((h) => (
            <View style={styles.card} key={h.id}>
              <Text style={styles.text}>{historyLabel(h.action)}</Text>
              <Text style={styles.muted}>
                {h.performedBy?.fullName || "AI service"} · {date(h.createdAt)}
              </Text>
              {h.toStatus && (
                <Text style={styles.muted}>
                  {h.fromStatus ? `${words(h.fromStatus)} → ` : ""}
                  {words(h.toStatus)}
                </Text>
              )}
              {h.note && <Text style={styles.muted}>{h.note}</Text>}
            </View>
          ))}
          {timeline && !timeline.content.length && (
            <EmptyState message="No timeline entries yet" />
          )}
          {timeline && (
            <Pagination
              page={page}
              totalPages={timeline.totalPages}
              change={setPage}
            />
          )}
          <Text style={[styles.heading, { marginTop: 25 }]}>Live camera</Text>
          <VideoStream
            url={
              incident.camera.status === "ONLINE"
                ? incident.camera.streamUrl
                : null
            }
          />
        </>
      )}
      <ConfirmDialog
        visible={action !== null}
        title={action ? actionLabels[action] : ""}
        message={action ? confirmMessages[action] : undefined}
        confirmLabel="Confirm"
        danger={action === "acknowledge"}
        busy={busy}
        error={error}
        noteLabel={
          action === "resolve"
            ? "Resolution note"
            : action === "false-alarm"
              ? "False alarm reason"
              : undefined
        }
        note={note}
        onNoteChange={setNote}
        onConfirm={() => {
          if (action) void submit(action);
        }}
        onCancel={() => setAction(null)}
      />
    </Screen>
  );
}
