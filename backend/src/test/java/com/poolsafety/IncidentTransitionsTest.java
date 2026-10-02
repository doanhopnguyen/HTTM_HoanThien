package com.poolsafety;

import com.poolsafety.incident.*;
import com.poolsafety.common.ApiException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class IncidentTransitionsTest {
    @Test void allTransitionsFollowTheSpecifiedMachine() {
        for(var from:IncidentStatus.values())for(var to:IncidentStatus.values()){
            boolean allowed=(from==IncidentStatus.NEW&&(to==IncidentStatus.ACKNOWLEDGED||to==IncidentStatus.FALSE_ALARM))
                ||(from==IncidentStatus.ACKNOWLEDGED&&(to==IncidentStatus.IN_PROGRESS||to==IncidentStatus.RESOLVED||to==IncidentStatus.FALSE_ALARM))
                ||(from==IncidentStatus.IN_PROGRESS&&to==IncidentStatus.RESOLVED);
            if(allowed)assertDoesNotThrow(()->IncidentTransitions.validate(from,to));
            else assertThrows(ApiException.class,()->IncidentTransitions.validate(from,to));
        }
    }
}
