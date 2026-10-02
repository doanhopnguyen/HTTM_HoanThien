import { Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import { useResource } from "../../hooks/useResource";
import {
  Screen,
  styles,
  Loading,
  ErrorState,
  Empty,
  Button,
} from "../../components/ui";
import { IncidentCard } from "../../components/IncidentCard";
import { activeStatuses } from "@pool-safety/shared";
export function HomeScreen() {
  const user = useAuthStore((s) => s.user)!;
  const connection = useUiStore((s) => s.connection);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const resource = useResource(
    () =>
      Promise.all([
        api.dashboard.summary(),
        api.dashboard.recent(),
        Promise.all(
          activeStatuses.map((status) =>
            api.incidents.list({ handledBy: user.id, status, size: 10 }),
          ),
        ).then((pages) => ({ content: pages.flatMap((page) => page.content) })),
      ]),
    [user.id],
  );
  return (
    <Screen>
      <Text style={styles.muted}>ON DUTY · {connection.toUpperCase()}</Text>
      <Text style={[styles.title, { marginTop: 10 }]}>
        Hello, {user.fullName.split(" ")[0]}
      </Text>
      <Text style={styles.subtitle}>Your pool safety overview</Text>
      {resource.error && <ErrorState message={resource.error} />}
      {resource.loading && !resource.data && <Loading />}
      {resource.data && (
        <>
          <View style={styles.row}>
            <View style={styles.stat}>
              <Text style={styles.muted}>ACTIVE ALERTS</Text>
              <Text style={styles.statValue}>
                {resource.data[0].activeIncidents}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.muted}>CAMERAS ONLINE</Text>
              <Text style={styles.statValue}>
                {resource.data[0].onlineCameras}/{resource.data[0].totalCameras}
              </Text>
            </View>
          </View>
          <Text style={styles.heading}>My active incidents</Text>
          {resource.data[2].content
            .filter((i) => activeStatuses.includes(i.status))
            .map((i) => (
              <IncidentCard
                key={i.id}
                incident={i}
                onPress={() =>
                  navigation.navigate("IncidentDetail", { id: i.id })
                }
              />
            ))}
          {!resource.data[2].content.some((i) =>
            activeStatuses.includes(i.status),
          ) && <Empty message="You have no assigned active incidents" />}
          <Text style={styles.heading}>Recent incidents</Text>
          {resource.data[1].content.slice(0, 5).map((i) => (
            <IncidentCard
              key={i.id}
              incident={i}
              onPress={() =>
                navigation.navigate("IncidentDetail", { id: i.id })
              }
            />
          ))}
          {!resource.data[1].content.length && (
            <Empty message="No recent incidents" />
          )}
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
