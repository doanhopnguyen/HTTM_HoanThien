package com.poolsafety.websocket;

import java.time.Instant;
import java.util.UUID;

public record RealtimeEvent(String type, Instant timestamp, Object data, UUID recipient) {
    public static RealtimeEvent all(String type,Object data) { return new RealtimeEvent(type,Instant.now(),data,null); }
    public static RealtimeEvent user(String type,Object data,UUID recipient) { return new RealtimeEvent(type,Instant.now(),data,recipient); }
}
