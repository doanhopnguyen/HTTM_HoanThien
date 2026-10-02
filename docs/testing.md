# Kiểm thử nghiệm thu

Chạy backend và database thật, Desktop Electron, Mobile trên emulator/thiết bị cùng backend. Dùng camera mới ONLINE + monitoring enabled; không dùng mẫu sự cố đã resolved để thử action.

| Bước | Kết quả cần quan sát |
| --- | --- |
| Admin đăng nhập Desktop | Dashboard/API dữ liệu thật; socket connected |
| Tạo camera | Xuất hiện Cameras và Live Monitor; không nhập UUID trên UI |
| Staff đăng nhập Mobile | Home, Alerts, Cameras, Profile; không có quyền quản trị |
| Gửi mock AI | API 201; event/incident/history/notifications lưu cùng transaction |
| Desktop nhận event | Critical popup, notification badge, active count tăng |
| Mobile foreground | Rung, in-app alert, Alerts cập nhật |
| Staff A và B cùng acknowledge | Một winner, một 409 INCIDENT_ALREADY_ASSIGNED |
| Staff A start | IN_PROGRESS; Desktop thấy đúng người xử lý |
| Staff A resolve với note | RESOLVED; Desktop cập nhật; active count giảm |
| Mở incident history | DETECTED, ACKNOWLEDGED, STARTED, RESOLVED và timestamps |
| Người khác thao tác incident đã assigned | Backend từ chối, UI không có action chiếm quyền |
| STAFF gọi camera/user mutations | 403 từ backend |
| Read notification của user khác | 404; không lộ notification |
| Tắt monitoring / disable camera | Detection bị từ chối; history camera được giữ |
| Tắt mạng rồi bật lại | Connection state thay đổi, reconnect và đồng bộ lại |
| Background rồi foreground Mobile | Reconnect; alerts được tải lại; không hứa có background push |
| Logout / đổi mật khẩu / disable user | Access/refresh cũ bị thu hồi |

Automated backend tests dùng embedded PostgreSQL thật và một HTTP/WebSocket server. Các test tạo dữ liệu biệt lập rồi truncate; **không chạy against production DB**. Shared client tests kiểm tra single-flight rotation, token lưu ephemeral khi bỏ Remember me, logout khi refresh fail và quyền action của UI.

Giao diện camera cần stream thật để nghiệm thu playback. Việc seed để source trống có chủ đích, không báo giả LIVE.

## Kiểm thử tự động giao diện

- `npm run test:e2e`: mở Electron thật với bundle Desktop, tạo camera trên UI, gửi detection qua API, quan sát cảnh báo và các cập nhật STAFF, kiểm tra timeline.
- `npm run test:e2e:mobile`: mở các màn hình React Native bằng Expo web preview trên Chrome, thao tác STAFF qua UI đến RESOLVED và logout. Backend và preview tại cổng 5173 phải chạy trước; xem README.
- `python scripts/test-mobile.py --help`: xem cách chạy nghiệm thu Android native bằng ADB khi có emulator/thiết bị sẵn sàng. Script này dùng database phát triển và tạo dữ liệu kiểm thử; không chạy trên production.

Kết quả thực tế và giới hạn môi trường được ghi trong [validation.md](validation.md). Test preview không xác nhận rung, SecureStore hoặc video native.
