import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../api/client";
import { useResource } from "../../hooks/useResource";
import {
  Screen,
  styles,
  Loading,
  ErrorState,
  StatusBadge,
} from "../../components/ui";
import { VideoStream } from "../../components/VideoStream";
export function CameraDetailScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "CameraDetail">) {
  const resource = useResource(
    () => api.cameras.get(route.params.id),
    [route.params.id],
  );
  return (
    <Screen>
      {resource.error && <ErrorState message={resource.error} />}
      {resource.loading && !resource.data && <Loading />}
      {resource.data && (
        <>
          <Text style={styles.title}>{resource.data.name}</Text>
          <Text style={styles.subtitle}>
            {resource.data.locationDescription}
          </Text>
          <StatusBadge status={resource.data.status} />
          <View style={{ marginTop: 24 }}>
            <VideoStream
              url={
                resource.data.status === "ONLINE"
                  ? resource.data.streamUrl
                  : null
              }
            />
          </View>
          <View style={styles.card}>
            <Text style={styles.text}>{resource.data.code}</Text>
            <Text style={styles.text}>
              Monitoring:{" "}
              {resource.data.monitoringEnabled ? "Enabled" : "Paused"}
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}
