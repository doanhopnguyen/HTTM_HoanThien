package com.poolsafety.websocket;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.*;

@Configuration @EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final RealtimeHub hub;
    private final String[] origins;
    public WebSocketConfig(RealtimeHub hub,@Value("${app.allowed-origins}") String origins){this.hub=hub;this.origins=origins.split(",");}
    @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry registry){registry.addHandler(hub,"/ws").setAllowedOrigins(origins);}
}
