import { Pressable, Text, View } from "react-native";
import type { Camera } from "../types";
import { StatusBadge } from "./StatusBadge";
import { styles } from "./styles";
import { theme } from "../theme";
export function CameraCard({
  camera,
  onPress,
}: {
  camera: Camera;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${camera.name}, ${camera.status}`}
    >
      <View style={styles.row}>
        <Text style={[styles.heading, { flexShrink: 1 }]}>{camera.name}</Text>
        <StatusBadge status={camera.status} />
      </View>
      <Text style={styles.muted}>
        {camera.code}
        {camera.locationDescription ? ` · ${camera.locationDescription}` : ""}
      </Text>
      <Text
        style={[
          styles.muted,
          { color: camera.monitoringEnabled ? theme.success : theme.muted },
        ]}
      >
        {camera.monitoringEnabled
          ? "● Monitoring enabled"
          : "Monitoring paused"}
      </Text>
    </Pressable>
  );
}
