package com.poolsafety.incident;

import com.poolsafety.common.ApiException;
import java.util.Map;
import java.util.Set;

public final class IncidentTransitions {
    private static final Map<IncidentStatus,Set<IncidentStatus>> ALLOWED=Map.of(
        IncidentStatus.NEW,Set.of(IncidentStatus.ACKNOWLEDGED,IncidentStatus.FALSE_ALARM),
        IncidentStatus.ACKNOWLEDGED,Set.of(IncidentStatus.IN_PROGRESS,IncidentStatus.RESOLVED,IncidentStatus.FALSE_ALARM),
        IncidentStatus.IN_PROGRESS,Set.of(IncidentStatus.RESOLVED));
    private IncidentTransitions() {}
    public static void validate(IncidentStatus from,IncidentStatus to) {
        if(!ALLOWED.getOrDefault(from,Set.of()).contains(to))throw new ApiException(409,"INVALID_INCIDENT_TRANSITION","Cannot change incident from "+from+" to "+to);
    }
}
