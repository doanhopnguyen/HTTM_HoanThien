import { useState } from "react";
import { Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../api/client";
import { useResource } from "../../hooks/useResource";
import {
  Screen,
  styles,
  Loading,
  ErrorState,
  EmptyState,
  Pagination,
  CameraCard,
} from "../../components/ui";
/** Read-only camera list for lifeguards. */
export function CamerasScreen() {
  const [page, setPage] = useState(0);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const resource = useResource(() => api.cameras.list({ page }), [page]);
  return (
    <Screen>
      <Text style={styles.title}>Cameras</Text>
      <Text style={styles.subtitle}>View camera status and live feeds</Text>
      {resource.error && (
        <ErrorState message={resource.error} onRetry={resource.reload} />
      )}
      {resource.loading && !resource.data && <Loading />}
      {resource.data && (
        <>
          {resource.data.content.map((c) => (
            <CameraCard
              key={c.id}
              camera={c}
              onPress={() => navigation.navigate("CameraDetail", { id: c.id })}
            />
          ))}
          {!resource.data.content.length && (
            <EmptyState message="No cameras configured" />
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
