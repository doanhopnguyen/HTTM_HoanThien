import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import { useResource } from "../../hooks/useResource";
import { incidentService } from "../../services/incidentService";
import {
  Screen,
  styles,
  Loading,
  ErrorState,
  EmptyState,
  Button,
} from "../../components/ui";
import { IncidentCard } from "../../components/IncidentCard";
export function HomeScreen() {
  const user = useAuthStore((s) => s.user)!;
  const connection = useUiStore((s) => s.connection);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const resource = useResource(() => incidentService.home(user.id), [user.id]);
  const open = (id: string) => navigation.navigate("IncidentDetail", { id });
  const data = resource.data;
  return (
    <Screen>
      <Text style={styles.muted}>ON DUTY · {connection.toUpperCase()}</Text>
      <Text style={[styles.title, { marginTop: 10 }]}>
        Hello, {user.fullName.split(" ")[0]}
      </Text>
      <Text style={styles.subtitle}>Your pool safety overview</Text>
      {resource.error && (
        <ErrorState message={resource.error} onRetry={resource.reload} />
      )}
      {resource.loading && !data && <Loading />}
      {data && (
        <>
          <View style={styles.row}>
            <View style={styles.stat}>
              <Text style={styles.muted}>ACTIVE ALERTS</Text>
              <Text style={styles.statValue}>
                {data.summary.activeIncidents}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.muted}>CAMERAS ONLINE</Text>
              <Text style={styles.statValue}>
                {data.summary.onlineCameras}/{data.summary.totalCameras}
              </Text>
            </View>
          </View>
          <Text style={styles.heading}>My active incident</Text>
          {data.myIncident ? (
            <IncidentCard
              incident={data.myIncident}
              onPress={() => open(data.myIncident!.id)}
            />
          ) : (
            <EmptyState message="You are not handling an incident" />
          )}
          {data.myActiveCount > 1 && (
            <Text style={[styles.muted, { marginBottom: 14 }]}>
              You are handling {data.myActiveCount} incidents. See them all in
              Alerts.
            </Text>
          )}
          <Text style={styles.heading}>Recent incidents</Text>
          {data.recent.map((i) => (
            <IncidentCard key={i.id} incident={i} onPress={() => open(i.id)} />
          ))}
          {!data.recent.length && <EmptyState message="No recent incidents" />}
          <Button
            label="Incident history"
            secondary
            onPress={() => navigation.navigate("History")}
          />
        </>
      )}
    </Screen>
  );
}
