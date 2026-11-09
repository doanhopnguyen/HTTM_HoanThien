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
  DetailRow,
  date,
} from "../../components/ui";
import { VideoStream } from "../../components/VideoStream";
/** Camera info, stream and monitoring state. Read-only for STAFF. */
export function CameraDetailScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "CameraDetail">) {
  const resource = useResource(
    () => api.cameras.get(route.params.id),
    [route.params.id],
  );
  const camera = resource.data;
  return (
    <Screen>
      {resource.error && (
        <ErrorState message={resource.error} onRetry={resource.reload} />
      )}
      {resource.loading && !camera && <Loading />}
      {camera && (
        <>
          <Text style={styles.title}>{camera.name}</Text>
          <Text style={styles.subtitle}>{camera.locationDescription}</Text>
          <StatusBadge status={camera.status} />
          <View style={{ marginTop: 24 }}>
            <VideoStream
              url={camera.status === "ONLINE" ? camera.streamUrl : null}
            />
          </View>
          <View style={styles.card}>
            <DetailRow label="Code" value={camera.code} />
            <DetailRow
              label="Status"
              value={<StatusBadge status={camera.status} />}
            />
            <DetailRow
              label="Monitoring"
              value={camera.monitoringEnabled ? "Enabled" : "Paused"}
            />
            <DetailRow
              label="Source"
              value={camera.streamUrlMasked || "Not configured"}
            />
            <DetailRow label="Updated" value={date(camera.updatedAt)} />
          </View>
        </>
      )}
    </Screen>
  );
}
