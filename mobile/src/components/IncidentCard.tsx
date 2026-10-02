import { Pressable, Text, View } from "react-native";
import type { Incident } from "@pool-safety/shared";
import { StatusBadge, styles, date } from "./ui";
import { theme } from "../theme";
export function IncidentCard({
  incident,
  onPress,
}: {
  incident: Incident;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.card,
        incident.status === "NEW" && {
          borderColor: "#fecaca",
          backgroundColor: "#fffafa",
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.row}>
        <Text
          style={{ fontSize: 11, color: theme.critical, fontWeight: "800" }}
        >
          {incident.detectionEvent.eventType.replaceAll("_", " ")} ALERT
        </Text>
        <StatusBadge status={incident.status} />
      </View>
      <Text style={[styles.heading, { marginTop: 14, marginBottom: 5 }]}>
        {incident.camera.name}
      </Text>
      <Text style={styles.muted}>{incident.camera.locationDescription}</Text>
      <Text style={[styles.muted, { marginTop: 10 }]}>
        {date(incident.detectionEvent.detectedAt)}
      </Text>
      <Text style={styles.text}>
        Confidence:{" "}
        {incident.detectionEvent.confidence === null
          ? "—"
          : `${Math.round(incident.detectionEvent.confidence * 100)}%`}
      </Text>
      <Text style={styles.muted}>
        {incident.handledBy
          ? `Handled by ${incident.handledBy.fullName}`
          : "Awaiting response"}
      </Text>
    </Pressable>
  );
}
