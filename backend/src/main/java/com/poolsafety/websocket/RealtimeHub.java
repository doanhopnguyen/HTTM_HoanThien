package com.poolsafety.websocket;

import com.poolsafety.security.TokenService;
import com.poolsafety.user.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.event.*;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Component @RequiredArgsConstructor
public class RealtimeHub extends TextWebSocketHandler {
    private record Client(WebSocketSession socket, Instant connectedAt, String token, User user) {}
    private final ConcurrentHashMap<String,Client> clients=new ConcurrentHashMap<>();
    private final TokenService tokens;
    private final ObjectMapper json;
    @Override public void afterConnectionEstablished(WebSocketSession s) {
        s.setTextMessageSizeLimit(8192);
        clients.put(s.getId(),new Client(new ConcurrentWebSocketSessionDecorator(s,5000,65536),Instant.now(),null,null));
    }
    @Override protected void handleTextMessage(WebSocketSession s,TextMessage message) throws Exception {
        var c=clients.get(s.getId()); if(c==null)return;
        try {
            var request=json.readTree(message.getPayload());
            if(!"AUTH".equals(request.path("type").asText())) {s.close(CloseStatus.POLICY_VIOLATION);return;}
            String raw=request.path("token").asText();var jwt=tokens.decode(raw);var user=tokens.user(jwt);
            clients.put(s.getId(),new Client(c.socket(),c.connectedAt(),raw,user));
            c.socket().sendMessage(new TextMessage("{\"type\":\"AUTHENTICATED\"}"));
        }catch(Exception e){clients.remove(s.getId());s.close(CloseStatus.POLICY_VIOLATION);}
    }
    @Override public void afterConnectionClosed(WebSocketSession s,CloseStatus status){clients.remove(s.getId());}
    @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT)
    public void broadcast(RealtimeEvent event) {
        for(var c:clients.values()) {
            if(c.user()==null || (event.recipient()!=null && !event.recipient().equals(c.user().getId())))continue;
            try {
                tokens.decode(c.token());
                c.socket().sendMessage(new TextMessage(json.writeValueAsString(java.util.Map.of("type",event.type(),"timestamp",event.timestamp(),"data",event.data()))));
            } catch(Exception e){close(c);}
        }
    }
    @Scheduled(fixedDelay=10000)
    public void reap() {
        for(var c:clients.values()) {
            try {
                if(c.user()==null){if(c.connectedAt().plusSeconds(10).isBefore(Instant.now()))close(c);}
                else {tokens.decode(c.token()); c.socket().sendMessage(new TextMessage("{\"type\":\"HEARTBEAT\"}"));}
            }catch(Exception e){close(c);}
        }
    }
    private void close(Client c){clients.remove(c.socket().getId());try{c.socket().close(CloseStatus.POLICY_VIOLATION);}catch(Exception ignored){}}
}
