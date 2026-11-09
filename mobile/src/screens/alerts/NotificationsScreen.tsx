import { useState } from "react";
import { Pressable, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../api/client";
import { errorMessage, type Notification } from "@pool-safety/shared";
import { useResource } from "../../hooks/useResource";
import { useUiStore } from "../../stores/uiStore";
import { useNotificationStore } from "../../stores/notificationStore";
import {
  Screen,
  styles,
  Button,
  Loading,
  ErrorState,
  EmptyState,
  Pagination,
  date,
} from "../../components/ui";
export function NotificationsScreen() {
  const [page, setPage] = useState(0);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const resource = useResource(() => api.notifications.list({ page }), [page]);
  async function select(n: Notification) {
    // Opening the incident must not depend on the read receipt succeeding.
    if (n.incidentId)
      navigation.navigate("IncidentDetail", { id: n.incidentId });
    if (n.read) return;
    try {
      await api.notifications.read(n.id);
      await useNotificationStore.getState().load();
      resource.reload();
    } catch (e) {
      useUiStore.getState().notify(errorMessage(e), "critical");
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>Notifications</Text>
      <Button
        label="Mark all as read"
        secondary
        onPress={async () => {
          try {
            await api.notifications.readAll();
            await useNotificationStore.getState().load();
            resource.reload();
          } catch (e) {
            useUiStore.getState().notify(errorMessage(e), "critical");
          }
        }}
      />
      {resource.error && (
        <ErrorState message={resource.error} onRetry={resource.reload} />
      )}
      {resource.loading && !resource.data && <Loading />}
      {resource.data && (
        <>
          {resource.data.content.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.card, !n.read && styles.unreadCard]}
              accessibilityRole="button"
              onPress={() => void select(n)}
            >
              <Text style={styles.heading}>{n.title}</Text>
              <Text style={styles.text}>{n.message}</Text>
              <Text style={styles.muted}>{date(n.createdAt)}</Text>
            </Pressable>
          ))}
          {!resource.data.content.length && (
            <EmptyState message="No notifications" />
          )}
          <Pagination
            page={page}
            totalPages={resource.data.totalPages}
            change={setPage}
          />
        </>
      )}
    </Screen>
  );
}
