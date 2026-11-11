# Chạy toàn bộ dự án để test trên Windows

Chạy các lệnh PowerShell tại `D:\DEV\HTTM_HoanThien`.

## 1. PostgreSQL và cấu hình

Máy hiện có PostgreSQL 18 chạy tại `localhost:5432`. Khi dùng PostgreSQL này, không cần bật thêm PostgreSQL Docker trên cùng cổng.

File `.env` ở thư mục gốc đã được cấu hình:

```dotenv
DB_URL=jdbc:postgresql://localhost:5432/pool_safety
DB_USER=postgres
DB_PASSWORD=123456
SPRING_PROFILES_ACTIVE=dev
DEV_PASSWORD=PoolSafetyDev!2026
DEV_SAMPLE_DATA=false
```

Giữ nguyên `JWT_SECRET`, `AI_SERVICE_KEY` và các biến khác trong file. Script backend tự nạp `.env`; chạy Java trực tiếp từ IDE cần khai báo các biến môi trường tương ứng.

Mật khẩu database phải khớp mật khẩu thực tế của PostgreSQL. Nếu lỗi `password authentication failed`, đăng nhập bằng tài khoản quản trị hiện có trong pgAdmin, mở Query Tool và chạy:

```sql
ALTER USER postgres WITH PASSWORD '123456';
```

Lệnh này đổi mật khẩu role PostgreSQL `postgres`, ảnh hưởng cả các ứng dụng khác đang dùng role đó. Hoặc sửa `DB_PASSWORD` trong `.env` thành mật khẩu thực tế mà bạn muốn giữ.

## 2. Xóa dữ liệu ứng dụng

Dừng backend đang chạy bằng Ctrl+C trước khi reset. Cần Java 25 và Maven có trong PATH.

```powershell
# Chỉ xem số bản ghi, không xóa:
powershell -ExecutionPolicy Bypass -File scripts/reset-local-db.ps1

# Xóa toàn bộ dữ liệu trong các bảng ứng dụng của pool_safety:
powershell -ExecutionPolicy Bypass -File scripts/reset-local-db.ps1 -Reset
```

Script chỉ chấp nhận `jdbc:postgresql://localhost:5432/pool_safety`. Nếu database chưa tồn tại, lệnh `-Reset` tạo database; nếu đã tồn tại, tạo lại schema `public`, xóa toàn bộ bảng và dữ liệu trong schema này, kể cả lịch sử Flyway. Backend sẽ chạy lại migration từ mã nguồn hiện tại. Không đụng đến database cũ `localtesthttm` hay database khác.

## 3. Khởi chạy backend — terminal 1

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-backend.ps1
```

Chờ backend khởi động xong. Flyway tạo schema, chế độ dev tạo đúng một ADMIN và một STAFF khi database sạch; không thêm camera, detection hay incident mẫu khi `DEV_SAMPLE_DATA=false`.

- Health: <http://localhost:8080/actuator/health>
- Swagger: <http://localhost:8080/swagger-ui>

Trong terminal khác, xác minh health:

```powershell
Invoke-RestMethod http://localhost:8080/actuator/health
```

Kết quả mong đợi: `status: UP`.

## 4. Khởi chạy Desktop — terminal 2

Chạy `npm install` ở thư mục gốc nếu chưa cài dependencies, sau đó:

```powershell
npm run desktop
```

Electron mở ứng dụng. Backend URL trên màn hình đăng nhập là `http://localhost:8080`. Nếu app đã lưu URL khác, sửa lại trong mục Backend connection.

## 5. Khởi chạy Mobile — terminal 3

File `mobile/.env` đã đặt cho Android emulator:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080
ALLOW_CLEARTEXT=true
```

Mở Android emulator trong Android Studio, rồi chạy:

```powershell
npm run mobile
```

Nhấn `a` trong terminal Expo để mở Android bằng Expo Go tương thích **SDK 58**. `npm run mobile` tự chọn Node được SDK 58 hỗ trợ; nếu máy đang dùng Node 25, launcher dùng Node 24 local tại `.tools/node24` (tự cài lần đầu nếu cần). Node hệ thống không bị thay đổi.

Bộ dependency hiện tại dùng Expo 58.0.24, React Native 0.88.1 và React 19.3.0. Tham khảo [hướng dẫn nâng SDK 58 của Expo](https://expo.dev/blog/how-to-upgrade-to-sdk-58) và [yêu cầu Node trong release notes](https://expo.dev/changelog/sdk-58#tool-version-bumps).

Sau khi nâng từ SDK 55, dừng Metro cũ rồi chạy lại với cache mới:

```powershell
npm run mobile -- --clear
```

Nếu dùng development build/APK tự build từ SDK 55, cần build lại native app cho SDK 58; bản native cũ không tương thích bộ JavaScript mới. Nếu đã cài Android SDK cùng JDK Android 17/21:

```powershell
npm run android -w mobile
```

Nếu thư mục `mobile/android` được sinh từ SDK cũ, chạy `npm run prebuild -w mobile -- --platform android` trước khi build. Prebuild SDK 58 sinh lại native project từ `app.json`, `app.config.js` và plugins; giữ mọi tùy chỉnh native cần thiết trong config/plugin trước khi chạy.

Backend dùng JDK 25; chọn JDK 17/21 cho Gradle Android. Với điện thoại thật, đổi URL trong `mobile/.env` sang `http://<IP-LAN-máy-tính>:8080`, kết nối cùng mạng và khởi động lại Metro sau khi sửa. Dùng `ipconfig` để xem IPv4 của Wi-Fi/Ethernet đang dùng. Cho phép kết nối cổng 8080 trong Windows Firewall nếu bị chặn.

## 6. Tài khoản sau khi reset và backend khởi động thành công

| Ứng dụng | Username | Vai trò | Mật khẩu |
| --- | --- | --- | --- |
| Desktop | `admin` | `ADMIN` | `PoolSafetyDev!2026` |
| Mobile | `staff1` | `STAFF` | `PoolSafetyDev!2026` |

Đây là mật khẩu ứng dụng; mật khẩu PostgreSQL là giá trị `DB_PASSWORD` riêng. Seeder giữ nguyên mật khẩu tài khoản đã tồn tại. Đặt `DEV_SAMPLE_DATA=false` không tự xóa dữ liệu cũ; cần chạy bước reset để bắt đầu sạch.

## 7. Test luồng cảnh báo

Để chọn video trên máy và chạy AI thật cho từng camera (YOLO26n hoặc checkpoint Drowning/ConvLSTM), xem [hướng dẫn camera và AI](camera-ai.md). Các bước dưới đây dùng sự kiện giả lập để kiểm tra luồng ứng dụng.

1. Đăng nhập Desktop bằng `admin`, tạo camera, đặt trạng thái ONLINE và bật monitoring. Nếu muốn xem video, thêm URL HTTP(S) MP4/HLS hợp lệ.
2. Đăng nhập Mobile bằng `staff1`.
3. Lấy ID camera từ Swagger `GET /api/cameras` sau khi đăng nhập/Authorize. Gửi sự kiện giả lập từ terminal khác:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/mock-ai-event.ps1 -CameraId '<ID-camera>'
```

4. Mobile nhận cảnh báo: Acknowledge → Start handling → Resolve và nhập ghi chú.
5. Kiểm tra Desktop cập nhật trạng thái, người xử lý và timeline.

Khi database sạch, Dashboard và danh sách camera/sự cố trống là bình thường. Tài khoản test chỉ được tạo sau khi backend kết nối database và khởi động thành công.
