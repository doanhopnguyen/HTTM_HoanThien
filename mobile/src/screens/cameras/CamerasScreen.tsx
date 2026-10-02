import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../api/client";
import { useCameraStore } from "../../stores/cameraStore";
import { useResource } from "../../hooks/useResource";
import {
  Screen,
  styles,
  Loading,
  ErrorState,
  Empty,
  StatusBadge,
  Pagination,
} from "../../components/ui";
export function CamerasScreen() {
  const [page, setPage] = useState(0);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const resource = useResource(async () => {
    const data = await api.cameras.list({ page });
    useCameraStore.getState().set(data.content);
    return data;
  }, [page]);
  return (
    <Screen>
      <Text style={styles.title}>Cameras</Text>
      <Text style={styles.subtitle}>View camera status and live feeds</Text>
      {resource.error && <ErrorState message={resource.error} />}
      {resource.loading && !resource.data && <Loading />}
      {resource.data && (
        <>
          {resource.data.content.map((c) => (
            <Pressable
              key={c.id}
              style={styles.card}
              onPress={() => navigation.navigate("CameraDetail", { id: c.id })}
            >
              <View style={styles.row}>
                <Text style={styles.heading}>{c.name}</Text>
                <StatusBadge status={c.status} />
              </View>
              <Text style={styles.muted}>{c.locationDescription}</Text>
              <Text style={styles.muted}>
                {c.monitoringEnabled
                  ? "Monitoring enabled"
                  : "Monitoring paused"}
              </Text>
            </Pressable>
          ))}
          {!resource.data.content.length && (
            <Empty message="No cameras configured" />
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
