import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUiStore } from "../stores/uiStore";
import { theme, radius } from "../theme";
const background = {
  critical: theme.critical,
  success: theme.success,
  info: theme.text,
} as const;
/**
 * In-app banner. Critical alerts stay until tapped or dismissed; other messages fade after 5 s.
 * Tapping a banner linked to an incident opens it.
 */
export function Toast({
  openIncident,
}: {
  openIncident: (id: string) => void;
}) {
  const banner = useUiStore((s) => s.banner);
  const dismiss = useUiStore((s) => s.dismiss);
  useEffect(() => {
    if (!banner || banner.sticky) return;
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [banner, dismiss]);
  if (!banner) return null;
  return (
    <View
      style={{
        position: "absolute",
        top: 60,
        left: 16,
        right: 16,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: radius.md,
        backgroundColor: background[banner.tone],
        elevation: 6,
      }}
    >
      <Pressable
        style={{ flex: 1, padding: 18 }}
        accessibilityRole="button"
        onPress={() => {
          if (banner.incidentId) openIncident(banner.incidentId);
          dismiss();
        }}
      >
        <Text
          accessibilityRole="alert"
          style={{ color: theme.onPrimary, fontWeight: "700" }}
        >
          {banner.title}
        </Text>
        {banner.message && (
          <Text style={{ color: theme.onPrimary, marginTop: 4 }}>
            {banner.message}
          </Text>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        onPress={dismiss}
        style={{ padding: 16 }}
      >
        <Ionicons name="close" size={20} color={theme.onPrimary} />
      </Pressable>
    </View>
  );
}
