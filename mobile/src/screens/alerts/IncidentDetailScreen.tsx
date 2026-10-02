import { useState } from "react";
import { Image, Modal, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../api/client";
import {
  actionLabels,
  incidentActions,
  errorMessage,
  type IncidentAction,
} from "@pool-safety/shared";
import { useResource } from "../../hooks/useResource";
import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import {
  Screen,
  styles,
  Loading,
  ErrorState,
  Button,
  Field,
  Input,
  StatusBadge,
  Pagination,
  date,
} from "../../components/ui";
import { VideoStream } from "../../components/VideoStream";
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
  const resource = useResource(
    () =>
      Promise.all([
        api.incidents.get(id),
        api.incidents.history(id, { page }),
        api.capabilities(),
      ]),
    [id, page],
  );
  async function submit(selected: IncidentAction) {
    setBusy(true);
    setError("");
    try {
      await api.incidents.action(id, selected, note);
      setAction(null);
      useUiStore.getState().invalidate();
    } catch (e) {
      setError(errorMessage(e));
      useUiStore.getState().invalidate();
    } finally {
      setBusy(false);
    }
  }
  function perform(selected: IncidentAction) {
    setError("");
    if (selected === "resolve" || selected === "false-alarm") {
      setNote("");
      setAction(selected);
    } else void submit(selected);
  }
  const incident = resource.data?.[0];
  return (
    <Screen>
      {resource.error && <ErrorState message={resource.error} />}
      {resource.loading && !incident && <Loading />}
      {incident && (
        <>
          <Text style={styles.title}>
            {incident.detectionEvent.eventType.replaceAll("_", " ")} alert
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
            <Text style={styles.muted}>No snapshot available</Text>
          )}
          {incident.detectionEvent.videoUrl && (
            <VideoStream url={incident.detectionEvent.videoUrl} />
          )}
          <View style={styles.card}>
            <Text style={styles.text}>
              Detected: {date(incident.detectionEvent.detectedAt)}
            </Text>
            <Text style={styles.text}>
              Confidence:{" "}
              {incident.detectionEvent.confidence === null
                ? "—"
                : `${Math.round(incident.detectionEvent.confidence * 100)}%`}
            </Text>
            <Text style={styles.text}>
              Handled by: {incident.handledBy?.fullName || "Unassigned"}
            </Text>
            {incident.resolutionNote && (
              <Text style={styles.text}>
                Resolution: {incident.resolutionNote}
              </Text>
            )}
          </View>
          {incident.handledBy && incident.handledBy.id !== user.id && (
            <Text style={styles.subtitle}>
              Currently handled by {incident.handledBy.fullName}
            </Text>
          )}
          {error && !action && <ErrorState message={error} />}
          {incidentActions(
            incident,
            user,
            resource.data![2].staffFalseAlarm,
          ).map((a) => (
            <Button
              key={a}
              label={actionLabels[a]}
              disabled={busy}
              secondary={a === "false-alarm"}
              onPress={() => perform(a)}
            />
          ))}
          <Text style={[styles.heading, { marginTop: 25 }]}>Timeline</Text>
          {resource
            .data![1].content.slice()
            .reverse()
            .map((h) => (
              <View style={styles.card} key={h.id}>
                <Text style={styles.text}>{h.action.replaceAll("_", " ")}</Text>
                <Text style={styles.muted}>
                  {h.performedBy?.fullName || "AI service"} ·{" "}
                  {date(h.createdAt)}
                </Text>
                {h.note && <Text style={styles.muted}>{h.note}</Text>}
              </View>
            ))}
          <Pagination
            page={page}
            totalPages={resource.data![1].totalPages}
            change={setPage}
          />
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
      <Modal
        visible={action !== null}
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setAction(null);
        }}
      >
        <Screen>
          <Text style={[styles.title, { marginTop: 35 }]}>
            {action && actionLabels[action]}
          </Text>
          <Field label="Resolution note">
            <Input
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              maxLength={5000}
              style={{ minHeight: 120, textAlignVertical: "top" }}
            />
          </Field>
          {error && <ErrorState message={error} />}
          <Button
            label="Confirm"
            disabled={busy || !note.trim()}
            onPress={() => {
              if (action) void submit(action);
            }}
          />
          <Button
            label="Cancel"
            secondary
            disabled={busy}
            onPress={() => setAction(null)}
          />
        </Screen>
      </Modal>
    </Screen>
  );
}
