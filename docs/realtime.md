# Realtime protocol

WebSocket URL: `ws://host:8080/ws` (production `wss://`). Native WebSocket, không dùng STOMP/SockJS. Kết nối phải gửi trong 10 giây:

```json
{"type":"AUTH","token":"<access-token>"}
```

Server xác thực JWT issuer/signature/expiry, account status và auth version, trả `{"type":"AUTHENTICATED"}`. Kết nối không được subscribe tự chọn user ID. Notification routing do server quyết định. Không đưa token vào URL/query logs.

Mọi event dữ liệu:

```json
{"type":"INCIDENT_CREATED","timestamp":"2026-10-02T12:30:00Z","data":{"id":"...","status":"NEW","camera":{},"detectionEvent":{},"handledBy":null}}
```

| Event | data | Người nhận |
| --- | --- | --- |
| INCIDENT_CREATED / ACKNOWLEDGED / STARTED / RESOLVED / FALSE_ALARM | IncidentResponse đầy đủ | Active authenticated users |
| CAMERA_STATUS_CHANGED | CameraResponse | Active authenticated users |
| CAMERA_DELETED | `{id}` | Active authenticated users |
| NOTIFICATION_CREATED / NOTIFICATION_READ | NotificationResponse | Chỉ chủ sở hữu |
| NOTIFICATIONS_READ_ALL | `{}` | Chỉ chủ sở hữu |
| HEARTBEAT | Không có | Kết nối đã xác thực |

Token/account được kiểm tra trước mỗi broadcast và mỗi heartbeat (10 giây). Session hết hạn/revoked đóng với policy violation; client rotate refresh token rồi reconnect. Backoff tối đa 30 giây. Sau AUTHENTICATED, client reload resources từ API để bù sự kiện bị mất. REST vẫn là nguồn dữ liệu chính; không coi WebSocket là event log có replay.

Broadcast chạy AFTER_COMMIT. Một backend duy nhất dùng in-memory session registry; mở rộng nhiều backend sẽ cần message broker, nằm ngoài phạm vi một backend của dự án.
