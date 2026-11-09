import { useState } from "react";
import { Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { activeStatuses, type IncidentStatus } from "@pool-safety/shared";
import type { RootStackParamList } from "../../navigation/types";
import { useResource } from "../../hooks/useResource";
import { incidentService } from "../../services/incidentService";
import {
  Screen,
  styles,
  Loading,
  ErrorState,
  EmptyState,
  Pagination,
  SegmentedFilter,
} from "../../components/ui";
import { IncidentCard } from "../../components/IncidentCard";
const filters = ["ACTIVE", ...activeStatuses] as const;
type Filter = (typeof filters)[number];
/** New and in-progress incidents, newest first (one paged request). */
export function AlertsScreen() {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<Filter>("ACTIVE");
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const resource = useResource(
    () =>
      incidentService.alerts(
        page,
        filter === "ACTIVE" ? undefined : (filter as IncidentStatus),
      ),
    [page, filter],
  );
  return (
    <Screen>
      <Text style={styles.title}>Active alerts</Text>
      <Text style={styles.subtitle}>
        Open an alert to respond and view its timeline.
      </Text>
      <SegmentedFilter
        options={filters}
        value={filter}
        onChange={(next) => {
          setFilter(next);
          setPage(0);
        }}
      />
      {resource.error && (
        <ErrorState message={resource.error} onRetry={resource.reload} />
      )}
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
            <EmptyState message="No alerts in this view" />
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
