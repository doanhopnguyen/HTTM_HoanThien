import { Text, View } from "react-native";
import { statusTone, toneColors } from "../theme";
import { styles } from "./styles";
/** Uniform incident / camera / account status badge (tones shared with Desktop). */
export function StatusBadge({ status }: { status: string }) {
  const tone =
    statusTone[status as keyof typeof statusTone] ??
    (status === "ACTIVE" ? "success" : "neutral");
  const { fg, bg } = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>
        {status.replaceAll("_", " ")}
      </Text>
    </View>
  );
}
