import { useState } from "react";
import { Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { IncidentStatus } from "@pool-safety/shared";
import type { RootStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../stores/authStore";
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
const scopes = ["MINE", "EVERYONE"] as const;
const outcomes = ["ALL", "RESOLVED", "FALSE_ALARM"] as const;
/** Closed incidents: by default the ones I handled, optionally the whole team's. */
export function HistoryScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "History">) {
  const user = useAuthStore((s) => s.user)!;
  const [page, setPage] = useState(0);
  const [scope, setScope] = useState<(typeof scopes)[number]>("MINE");
  const [outcome, setOutcome] = useState<(typeof outcomes)[number]>("ALL");
  const resource = useResource(
    () =>
      incidentService.history(
        page,
        scope === "MINE" ? user.id : null,
        outcome === "ALL" ? undefined : (outcome as IncidentStatus),
      ),
    [page, scope, outcome, user.id],
  );
  return (
    <Screen>
      <Text style={styles.title}>Incident history</Text>
      <Text style={styles.subtitle}>Resolved incidents and false alarms.</Text>
      <SegmentedFilter
        options={scopes}
        value={scope}
        label={(s) => (s === "MINE" ? "Handled by me" : "Whole team")}
        onChange={(next) => {
          setScope(next);
          setPage(0);
        }}
      />
      <SegmentedFilter
        options={outcomes}
        value={outcome}
        onChange={(next) => {
          setOutcome(next);
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
            <EmptyState message="No closed incidents in this view" />
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
