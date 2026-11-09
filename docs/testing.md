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
| STAFF khác thao tác incident đã assigned | Backend từ chối 409, UI không có action chiếm quyền |
| ADMIN override resolve/false alarm | Thành công; timeline có ADMIN_OVERRIDE_*, người xử lý nhận notification, audit ADMIN_OVERRIDE |
| ADMIN reset mật khẩu STAFF | Phiên cũ của STAFF bị thu hồi; đăng nhập bằng mật khẩu mới |
| Mở app khi backend tắt | Phiên đã lưu được giữ; màn hình đăng nhập có Retry |
| STAFF gọi camera/user mutations | 403 từ backend |
| Read notification của user khác | 404; không lộ notification |
| Tắt monitoring / disable camera | Detection bị từ chối; history camera được giữ |
| Tắt mạng rồi bật lại | Connection state thay đổi, reconnect và đồng bộ lại |
| Background rồi foreground Mobile | Reconnect; alerts được tải lại; không hứa có background push |
| Logout / đổi mật khẩu / disable user | Access/refresh cũ bị thu hồi |

Automated backend tests dùng embedded PostgreSQL thật và một HTTP/WebSocket server. Các test tạo dữ liệu biệt lập rồi truncate; **không chạy against production DB**. Shared client tests kiểm tra single-flight rotation, token lưu ephemeral khi bỏ Remember me, logout khi server từ chối refresh, **giữ phiên khi mất mạng** và quyền action của UI (gồm ADMIN override).

Backend integration tests còn bao gồm: format lỗi 404/405/400/415; ADMIN override (history, audit, notification); STAFF không override được; incident đã đóng trả `INVALID_INCIDENT_TRANSITION`; reset mật khẩu; lọc user/camera/audit; `/staff` loại user DISABLED; validate camera, mã trùng, xóa cứng khi chưa có detection, `/online`; detection với camera không tồn tại, DISABLED, thời gian tương lai, sai key; false alarm qua API và khi `STAFF_FALSE_ALARM=false`; STAFF bị 403 ở mọi mutation quản trị và report; số liệu report/thống kê theo ngày và camera; pagination và unread count; audit được ghi.

Giao diện camera cần stream thật để nghiệm thu playback. Việc seed để source trống có chủ đích, không báo giả LIVE.

## Kiểm thử tự động giao diện

- `npm run test:e2e`: mở Electron thật với bundle Desktop, tạo và **sửa** camera trên UI, gửi detection qua API, kiểm tra panel cảnh báo (confidence), số Active incidents và badge thông báo tăng realtime, quan sát cập nhật STAFF và timeline, rồi xử lý incident thứ hai hoàn toàn từ panel Desktop (Acknowledge → Start → Resolve có ghi chú) và kiểm tra số liệu trở lại.
- `npm run test:e2e:mobile`: mở các màn hình React Native bằng Expo web preview trên Chrome, thao tác STAFF qua UI (có hộp xác nhận) đến RESOLVED, kiểm tra một client ADMIN khác nhận `INCIDENT_ACKNOWLEDGED/STARTED/RESOLVED` qua WebSocket thật, rồi logout. Backend và preview tại cổng 5173 phải chạy trước; xem README.
- Đặt `E2E_BASE_URL` (mặc định `http://localhost:8080`) khi backend chạy ở cổng khác, ví dụ `PORT=8081`.
- `python scripts/test-mobile.py --help`: xem cách chạy nghiệm thu Android native bằng ADB khi có emulator/thiết bị sẵn sàng. Script này dùng database phát triển và tạo dữ liệu kiểm thử; không chạy trên production.

Kết quả thực tế và giới hạn môi trường được ghi trong [validation.md](validation.md). Test preview không xác nhận rung, SecureStore hoặc video native.
