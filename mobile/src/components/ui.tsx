import { cloneElement, isValidElement, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { theme } from "../theme";
import { useUiStore } from "../stores/uiStore";
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20, paddingBottom: 38 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.muted,
    lineHeight: 21,
    marginBottom: 20,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 14,
  },
  text: { color: theme.text, fontSize: 14, lineHeight: 22 },
  muted: { color: theme.muted, fontSize: 12, lineHeight: 19 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 9,
    padding: 13,
    color: theme.text,
    fontSize: 15,
    marginBottom: 14,
  },
  label: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 7,
  },
  button: {
    backgroundColor: theme.primary,
    padding: 14,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  error: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 16,
    marginVertical: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: theme.surface,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 18,
  },
  statValue: {
    fontSize: 30,
    fontWeight: "800",
    color: theme.primary,
    marginVertical: 10,
  },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 5,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 10, fontWeight: "800" },
  empty: { padding: 30, alignItems: "center" },
});
export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
export function Button({
  label,
  onPress,
  disabled,
  danger,
  secondary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        danger && { backgroundColor: theme.critical },
        secondary && { backgroundColor: "#e2e8f0" },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: theme.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Input(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      style={[styles.input, props.style]}
      placeholderTextColor={theme.muted}
    />
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {isValidElement<Record<string, unknown>>(children)
        ? cloneElement(children, { accessibilityLabel: label })
        : children}
    </View>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const color =
    status === "NEW"
      ? theme.critical
      : ["RESOLVED", "ONLINE", "ACTIVE"].includes(status)
        ? theme.success
        : ["ACKNOWLEDGED", "OFFLINE"].includes(status)
          ? theme.warning
          : status === "IN_PROGRESS"
            ? theme.primary
            : theme.muted;
  return (
    <View style={[styles.badge, { backgroundColor: color + "18" }]}>
      <Text style={[styles.badgeText, { color }]}>
        {status.replaceAll("_", " ")}
      </Text>
    </View>
  );
}
export function Loading() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={theme.primary} />
      <Text style={styles.muted}>Loading…</Text>
    </View>
  );
}
export function Empty({ message = "No records found" }: { message?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}
export function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.error}>
      <Text accessibilityRole="alert" style={{ color: theme.critical }}>
        {message}
      </Text>
      <Button
        label="Retry"
        secondary
        onPress={() => useUiStore.getState().invalidate()}
      />
    </View>
  );
}
export function Pagination({
  page,
  totalPages,
  change,
}: {
  page: number;
  totalPages: number;
  change: (page: number) => void;
}) {
  return (
    <View style={styles.row}>
      <Button
        label="Previous"
        secondary
        disabled={page === 0}
        onPress={() => change(page - 1)}
      />
      <Text style={styles.muted}>
        {page + 1} / {Math.max(1, totalPages)}
      </Text>
      <Button
        label="Next"
        secondary
        disabled={page + 1 >= totalPages}
        onPress={() => change(page + 1)}
      />
    </View>
  );
}
export function date(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}
