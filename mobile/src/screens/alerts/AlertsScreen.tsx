import { useState } from "react";
import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../api/client";
import { activeStatuses, type IncidentStatus } from "@pool-safety/shared";
import { useResource } from "../../hooks/useResource";
import {
  Screen,
  styles,
  Loading,
  ErrorState,
  Empty,
  Pagination,
  Button,
} from "../../components/ui";
import { IncidentCard } from "../../components/IncidentCard";
export function AlertsScreen({ history = false }: { history?: boolean }) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<IncidentStatus | "ACTIVE" | "ALL">(
    history ? "ALL" : "ACTIVE",
  );
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const resource = useResource(async () => {
    if (filter !== "ACTIVE")
      return api.incidents.list({
        page,
        status: filter === "ALL" ? undefined : filter,
        size: 15,
      });
    const pages = await Promise.all(
      activeStatuses.map((status) =>
        api.incidents.list({ status, page, size: 10 }),
      ),
    );
    return {
      content: pages
        .flatMap((p) => p.content)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      totalPages: Math.max(...pages.map((p) => p.totalPages)),
    };
  }, [page, filter]);
  return (
    <Screen>
      <Text style={styles.title}>
        {history ? "Incident history" : "Active alerts"}
      </Text>
      <Text style={styles.subtitle}>
        Open an alert to respond and view its timeline.
      </Text>
      <View
        style={[
          styles.row,
          { flexWrap: "wrap", justifyContent: "flex-start", marginBottom: 20 },
        ]}
      >
        {(history
          ? ["ALL", "RESOLVED", "FALSE_ALARM"]
          : ["ACTIVE", ...activeStatuses]
        ).map((s) => (
          <Button
            key={s}
            label={s.replaceAll("_", " ")}
            secondary={filter !== s}
            onPress={() => {
              setFilter(s as typeof filter);
              setPage(0);
            }}
          />
        ))}
      </View>
      {resource.error && <ErrorState message={resource.error} />}
      {resource.loading && !resource.data && <Loading />}
      {resource.data && (
        <>
          {resource.data.content.map((i) => (
            <IncidentCard
              key={i.id}
              incident={i}
              onPress={() =>
                navigation.navigate("IncidentDetail", { id: i.id })
              }
            />
          ))}
          {!resource.data.content.length && (
            <Empty message="No alerts in this view" />
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
