import type { ReactNode } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { theme } from "../theme";
import { useUiStore } from "../stores/uiStore";
import { Button } from "./Button";
import { styles } from "./styles";
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
export function Loading() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={theme.primary} />
      <Text style={styles.muted}>Loading…</Text>
    </View>
  );
}
export function EmptyState({
  message = "No records found",
}: {
  message?: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}
/** @deprecated use EmptyState */
export const Empty = EmptyState;
/** Error with a retry; `onRetry` reloads only the failed resource (defaults to every screen). */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.error}>
      <Text accessibilityRole="alert" style={{ color: theme.critical }}>
        {message}
      </Text>
      <Button
        label="Retry"
        secondary
        onPress={onRetry ?? (() => useUiStore.getState().invalidate())}
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
  if (totalPages <= 1) return null;
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
/** Label / value line used in detail cards. */
export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.muted}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={[styles.text, { flexShrink: 1, textAlign: "right" }]}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}
