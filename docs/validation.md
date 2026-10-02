# Kết quả build và kiểm thử

Ngày kiểm tra: **02/10/2026**, Windows, Java 25 cho backend, Android Studio JBR 21 cho Android. Đây là bản phát triển có thể chạy end-to-end với backend thật và PostgreSQL thật.

## Artifact đã tạo

| Artifact | Vị trí | Dung lượng |
| --- | --- | --- |
| Windows NSIS installer | `desktop/release/PoolSafetyMonitoring Setup 1.0.0.exe` | 121.045.432 bytes |
| Android APK | `artifacts/PoolSafetyMonitoring.apk` | 47.271.150 bytes |
| Spring Boot executable JAR | `backend/target/pool-safety-1.0.0.jar` | 68.762.032 bytes |

Installer Windows mặc định kết nối `http://localhost:8080`; có thể đổi địa chỉ tại màn hình đăng nhập. Installer chưa ký bằng chứng thư phân phối Windows.

APK hiện tại dành cho thử nghiệm: backend `http://10.0.2.2:8080`, cho phép HTTP, package `com.poolsafety.mobile`, version 1.0.0, Android API tối thiểu 24, target 36, ABI `arm64-v8a` và `x86_64`. `apksigner verify` đã thành công; APK dùng development signing key của native template. Muốn cài lên điện thoại thật, build lại bằng URL/IP LAN phù hợp hoặc HTTPS theo README. Không dùng địa chỉ emulator cho điện thoại thật.

SHA-256:

```text
Windows: 40B1B3865023B63D079986B68BB3CC839A8891B59EDF2530BE819132C4F6F521
Android: 0059DD16377595A93DF2B7CF63A17096AA74B17EBBE3F1059DAF827F1404B052
Backend: 12B4BCBE5EA1BC8438C582626EDCA337269B42446A777BB935D1F3B2B1009542
```

## Kiểm thử đã đạt

| Kiểm tra | Kết quả |
| --- | --- |
| `mvn -B -f backend/pom.xml verify` | **18 test**, 0 failures, 0 errors, 0 skipped; JAR được đóng gói thành công |
| `npm test` | **5 test** shared API client và quyền thao tác UI đạt |
| `npm run typecheck` | Shared, Desktop, Electron và Mobile đạt |
| `npm run test:e2e` | **1 luồng Electron thật** đạt |
| `npm run test:e2e:mobile` | **1 luồng React Native browser preview** đạt |
| Android local `assembleRelease` | BUILD SUCCESSFUL; kiểm tra package, ABI và chữ ký đạt |
| Electron NSIS packaging | Installer `.exe` và `win-unpacked` được tạo thành công |

Backend kiểm tra PostgreSQL/Flyway/JPA thật, auth và refresh rotation, refresh đồng thời, thu hồi phiên, phân quyền, AI key, camera credentials, camera offline notification, state machine, acknowledge đồng thời, ownership, transaction rollback, dashboard, seed và WebSocket thật. CORS được sửa để Spring Security dùng đúng bean cấu hình; test hồi quy xác nhận origin đã khai báo được phép và origin lạ bị từ chối.

Electron test đăng nhập ADMIN, tạo camera trên UI, gửi detection qua API AI, nhận popup realtime, quan sát STAFF acknowledge/start/resolve và timeline đủ bốn mốc. STAFF actions của test này đi qua REST; mobile preview test thực hiện các actions đó trên UI React Native, kiểm tra handler STAFF, resolution note, timeline và logout. Các test này dùng dữ liệu phát triển và tạo thêm camera/incident.

Ảnh đã xem và kiểm tra bố cục:

- [Desktop dashboard](screenshots/desktop-dashboard.png)
- [Desktop incident](screenshots/desktop-incident.png)
- [Mobile home — browser preview](screenshots/mobile-preview-home.png)
- [Mobile incident và timeline — browser preview](screenshots/mobile-preview-incident.png)

Log build/test nằm tại thư mục gốc (`final-backend-test.log`, `final-shared-test.log`, `final-typecheck.log`, `desktop-test-final.log`, `mobile-preview-test-final.log`, `android-build-final.log`); log và build output được gitignore. Báo cáo Maven nằm trong `backend/target/surefire-reports/`.

## Phạm vi chưa xác nhận

Android emulator trên máy này không khởi động ổn định: ADB chuyển offline hoặc emulator dừng trước khi có thể chạy luồng nghiệm thu. **Chưa xác nhận runtime APK trên Android thật/emulator**. Browser preview xác nhận logic màn hình và API/realtime; cần chạy `scripts/test-mobile.py` trên thiết bị sẵn sàng để kiểm tra native installation, navigation, SecureStore, rung và lifecycle. Playback cần camera HLS/MP4 thật; dữ liệu seed không có stream.

Docker Compose chưa được chạy trong môi trường này. Backend đã chạy với embedded PostgreSQL thật. iOS chưa build vì môi trường Windows.

`npm audit` tại lần kiểm tra cuối báo 11 vấn đề (4 high, 7 moderate), liên quan chuỗi dependency Expo tooling với `node-forge`, `uuid`/`xcode`. Electron đã được nâng lên 44.5.1. Không tự áp dụng đề xuất downgrade Expo SDK 44 của audit vì không tương thích SDK 55 của dự án; các advisory còn lại cần được xử lý theo bản cập nhật upstream trước khi phân phối chính thức. Báo cáo chi tiết local: `npm-audit.json`.

## Backend phát triển hiện tại

Backend đã chạy tại `http://localhost:8080`, database kiểm thử giao diện được giữ tại `.runtime/postgres-v2` (cổng 5433). Để mở lại đúng dữ liệu này khi backend đã dừng:

```powershell
$env:LOCAL_DB_DIR='.runtime/postgres-v2'
powershell -ExecutionPolicy Bypass -File scripts/start-backend.ps1 -EmbeddedPostgres
```

Launcher không đặt `LOCAL_DB_DIR` dùng `.runtime/postgres`. Tài khoản dev: `admin`, `staff1`, `staff2`, `staff3`; mật khẩu được cấu hình trong `.env`. Không dùng database dev hoặc tài khoản seed để triển khai production.
