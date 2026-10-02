Bạn là Senior Software Architect + Senior Full-stack Engineer + Senior Mobile Engineer.

Hãy xây dựng HOÀN CHỈNH một hệ thống:

# POOL SAFETY MONITORING SYSTEM

Đây là hệ thống giám sát an toàn cho MỘT HỒ BƠI DUY NHẤT.

Mục tiêu:

- quản lý camera;
- giám sát camera;
- tiếp nhận sự kiện phát hiện đuối nước từ AI trong tương lai;
- tạo và quản lý sự cố;
- gửi cảnh báo realtime;
- hỗ trợ Admin trên Desktop App;
- hỗ trợ nhân viên cứu hộ trên Mobile App.

Hiện tại KHÔNG triển khai:

- YOLO;
- YOWO;
- computer vision;
- training model;
- xử lý AI.

Chỉ xây dựng:

- Backend;
- Database;
- Desktop App;
- Mobile App;
- Realtime;
- API tích hợp AI trong tương lai.

Hệ thống chỉ dành cho MỘT hồ bơi.

KHÔNG xây:

- multi-tenant;
- multi-company;
- multi-branch;
- multi-pool;
- organization hierarchy phức tạp.

---

# 1. KIẾN TRÚC TỔNG THỂ

Kiến trúc phải là:

Camera
|
| Video Stream
v

AI Service
(Future - chưa triển khai)
|
| POST Detection Event
v

Spring Boot Backend
|
+----------------------+
| |
v v
PostgreSQL WebSocket
|
+------------+------------+
| |
v v
Desktop App Mobile App
Electron + React React Native
ADMIN STAFF

Desktop và Mobile KHÔNG kết nối trực tiếp Database.

Mọi dữ liệu phải đi qua Backend API.

---

# 2. TECHNOLOGY STACK

## Backend

Sử dụng:

- Java 25
- Spring Boot
- Maven
- Spring Web
- Spring Security
- Spring Data JPA
- Spring Validation
- PostgreSQL
- Flyway
- JWT
- BCrypt
- WebSocket
- Lombok
- Jackson
- Swagger / OpenAPI

Cấu hình:

spring.jpa.hibernate.ddl-auto=validate

Flyway phải chịu trách nhiệm tạo schema.

Không sử dụng:

ddl-auto=create
ddl-auto=create-drop

---

# 3. DESKTOP APP

Desktop là ứng dụng chính của ADMIN và phòng giám sát.

Sử dụng:

- Electron
- React
- TypeScript
- Vite
- React Router
- Axios
- Zustand
- WebSocket client
- Tailwind CSS hoặc hệ thống CSS thống nhất
- Lucide Icons hoặc thư viện icon tương đương

Desktop phải có thể build thành ứng dụng Windows.

Ví dụ:

PoolSafetyMonitoring.exe

Không biến Desktop thành web app thuần.

---

# 4. MOBILE APP

Mobile sử dụng:

- React Native
- TypeScript
- React Navigation
- Axios
- Zustand
- WebSocket client
- AsyncStorage hoặc secure storage phù hợp
- React Native Vector Icons hoặc icon library tương đương

Mobile hướng tới:

Android trước.

Kiến trúc không được phụ thuộc riêng Android để sau này vẫn có thể hỗ trợ iOS.

Mobile dành chủ yếu cho STAFF / nhân viên cứu hộ.

---

# 5. ROLE

Chỉ có hai role:

ADMIN

STAFF

---

# 6. QUYỀN ADMIN

ADMIN có quyền:

- đăng nhập;
- xem Dashboard;
- xem realtime incidents;
- xem camera;
- quản lý camera;
- thêm camera;
- sửa camera;
- bật/tắt giám sát;
- quản lý tài khoản;
- tạo STAFF;
- disable tài khoản;
- xem incidents;
- acknowledge incident;
- start handling;
- resolve incident;
- đánh dấu false alarm;
- xem báo cáo;
- xem lịch sử;
- xem audit logs nếu cần;
- cấu hình hệ thống cơ bản.

---

# 7. QUYỀN STAFF

STAFF có quyền:

- đăng nhập Mobile App;
- xem Home;
- nhận cảnh báo;
- xem incident;
- xem camera;
- xem snapshot/video của incident;
- acknowledge incident;
- start handling;
- resolve incident;
- đánh dấu false alarm nếu được cho phép;
- xem lịch sử;
- xem profile;
- đổi mật khẩu;
- logout.

STAFF KHÔNG được:

- tạo user;
- sửa user khác;
- thêm camera;
- sửa camera;
- xóa camera;
- thay đổi cấu hình hệ thống.

Backend phải kiểm tra role.

Không chỉ ẩn button ở frontend.

---

# 8. DATABASE

Chỉ sử dụng các bảng chính:

users

refresh_tokens

cameras

detection_events

incidents

notifications

incident_history

audit_logs

Không tạo bảng pool/location/branch/company.

---

# 9. USERS TABLE

users:

- id UUID PK
- username varchar(100) UNIQUE NOT NULL
- email varchar(255) UNIQUE NOT NULL
- password_hash varchar(255) NOT NULL
- full_name varchar(150) NOT NULL
- role varchar(30) NOT NULL
- status varchar(30) NOT NULL
- created_at timestamptz
- updated_at timestamptz

role:

ADMIN

STAFF

status:

ACTIVE

DISABLED

---

# 10. REFRESH TOKENS

refresh_tokens:

- id UUID PK
- user_id FK users
- token_hash varchar
- expires_at timestamptz
- revoked_at nullable
- created_at
- device_name nullable

Không lưu refresh token plaintext nếu có thể tránh.

Hỗ trợ refresh token rotation.

---

# 11. CAMERAS TABLE

cameras:

- id UUID PK
- code varchar UNIQUE NOT NULL
- name varchar NOT NULL
- location_description varchar
- stream_url varchar
- status varchar
- monitoring_enabled boolean
- created_at
- updated_at

Camera status:

ONLINE

OFFLINE

DISABLED

Ví dụ:

code:
CAM-01

name:
Camera khu vực nước sâu

location_description:
Góc phía Bắc hồ bơi

---

# 12. DETECTION EVENTS

detection_events:

- id UUID PK
- camera_id FK cameras
- event_type varchar
- confidence numeric
- snapshot_url varchar nullable
- video_url varchar nullable
- metadata jsonb nullable
- detected_at timestamptz
- created_at timestamptz

event_type ban đầu:

DROWNING

Nhưng thiết kế để sau này có thể thêm:

FALL

UNUSUAL_BEHAVIOR

UNATTENDED_CHILD

hoặc loại khác mà không phải sửa kiến trúc lớn.

Backend KHÔNG được phụ thuộc model AI cụ thể.

---

# 13. INCIDENTS

incidents:

- id UUID PK
- detection_event_id FK UNIQUE
- status varchar NOT NULL
- handled_by UUID nullable FK users
- acknowledged_at timestamptz nullable
- started_at timestamptz nullable
- resolved_at timestamptz nullable
- resolution_note text nullable
- created_at
- updated_at

Incident status:

NEW

ACKNOWLEDGED

IN_PROGRESS

RESOLVED

FALSE_ALARM

---

# 14. INCIDENT STATE MACHINE

Chỉ cho phép:

NEW
→ ACKNOWLEDGED

NEW
→ FALSE_ALARM

ACKNOWLEDGED
→ IN_PROGRESS

ACKNOWLEDGED
→ RESOLVED

ACKNOWLEDGED
→ FALSE_ALARM

IN_PROGRESS
→ RESOLVED

Không cho phép:

RESOLVED → NEW

FALSE_ALARM → NEW

IN_PROGRESS → ACKNOWLEDGED

Frontend KHÔNG tự quyết định transition.

Backend phải validate.

---

# 15. INCIDENT HISTORY

incident_history:

- id UUID PK
- incident_id FK
- action
- from_status nullable
- to_status nullable
- performed_by FK users nullable
- note nullable
- created_at

Ví dụ:

DETECTED

ACKNOWLEDGED

STARTED

RESOLVED

MARKED_FALSE_ALARM

Dùng bảng này để dựng Timeline trên UI.

---

# 16. NOTIFICATIONS

notifications:

- id UUID PK
- user_id FK users
- incident_id FK incidents nullable
- type varchar
- title
- message
- is_read boolean
- read_at nullable
- created_at

type có thể:

INCIDENT_CREATED

INCIDENT_ACKNOWLEDGED

INCIDENT_RESOLVED

CAMERA_OFFLINE

SYSTEM

---

# 17. AUDIT LOGS

audit_logs:

- id UUID PK
- user_id nullable FK users
- action
- entity_type
- entity_id
- description
- created_at

Audit các hành động:

LOGIN

LOGOUT

CREATE_USER

UPDATE_USER

DISABLE_USER

CREATE_CAMERA

UPDATE_CAMERA

ENABLE_MONITORING

DISABLE_MONITORING

ACKNOWLEDGE_INCIDENT

START_INCIDENT

RESOLVE_INCIDENT

FALSE_ALARM

---

# 18. AUTHENTICATION API

Triển khai:

POST /api/auth/login

POST /api/auth/refresh

POST /api/auth/logout

POST /api/auth/change-password

GET /api/auth/me

Login request:

{
"username": "...",
"password": "..."
}

Login response:

{
"accessToken": "...",
"refreshToken": "...",
"user": {
"id": "...",
"username": "...",
"fullName": "...",
"role": "ADMIN"
}
}

Access token thời hạn ngắn.

Refresh token thời hạn dài.

Sử dụng BCrypt.

Không lưu password plaintext.

---

# 19. USER APIs

ADMIN only:

GET /api/users

GET /api/users/{id}

POST /api/users

PATCH /api/users/{id}

PATCH /api/users/{id}/status

GET /api/users/staff

Frontend không được yêu cầu người dùng nhập UUID.

Khi cần chọn STAFF phải tải danh sách user để select.

---

# 20. CAMERA APIs

GET /api/cameras

GET /api/cameras/{id}

POST /api/cameras

PATCH /api/cameras/{id}

PATCH /api/cameras/{id}/monitoring

PATCH /api/cameras/{id}/status

DELETE /api/cameras/{id}

GET /api/cameras/online

Nếu camera đã có detection history thì ưu tiên disable thay vì hard delete.

---

# 21. FUTURE AI API

Đây là API quan trọng nhất để tích hợp AI sau này.

POST /api/detection-events

Request:

{
"cameraId": "...",
"eventType": "DROWNING",
"confidence": 0.94,
"snapshotUrl": "...",
"videoUrl": "...",
"detectedAt": "2026-10-02T19:30:00+07:00",
"metadata": {}
}

Khi API được gọi:

1. Validate camera tồn tại.

2. Camera không được DISABLED.

3. monitoring_enabled phải bằng true.

4. Validate confidence nếu có.

5. Lưu DetectionEvent.

6. Tạo Incident status NEW.

7. Ghi IncidentHistory.

8. Tạo Notifications.

9. Broadcast WebSocket.

10. Trả:

{
"detectionEventId": "...",
"incidentId": "...",
"status": "NEW"
}

Endpoint AI phải có service authentication riêng.

Ví dụ:

X-AI-SERVICE-KEY

Không sử dụng JWT user cho AI service.

Secret đọc từ environment variable.

---

# 22. INCIDENT APIs

GET /api/incidents

Filter hỗ trợ:

status

cameraId

handledBy

from

to

search

page

size

GET /api/incidents/{id}

PATCH /api/incidents/{id}/acknowledge

PATCH /api/incidents/{id}/start

PATCH /api/incidents/{id}/resolve

PATCH /api/incidents/{id}/false-alarm

GET /api/incidents/{id}/history

---

# 23. ACKNOWLEDGE RULE

Khi user acknowledge:

NEW → ACKNOWLEDGED

set:

handled_by = currentUser

acknowledged_at = now

Nếu incident đã được người khác acknowledge:

không cho user khác chiếm quyền xử lý một cách im lặng.

Trả thông báo:

Incident is already being handled by ...

Desktop và Mobile phải cập nhật realtime.

---

# 24. RESOLVE

Resolve request:

{
"note": "..."
}

Cho phép:

ACKNOWLEDGED → RESOLVED

IN_PROGRESS → RESOLVED

Set:

resolved_at

resolution_note

Lưu IncidentHistory.

Broadcast realtime.

---

# 25. NOTIFICATION APIs

GET /api/notifications

GET /api/notifications/unread-count

PATCH /api/notifications/{id}/read

PATCH /api/notifications/read-all

Có pagination.

---

# 26. DASHBOARD API

GET /api/dashboard/summary

Response:

{
"totalCameras": 6,
"onlineCameras": 5,
"offlineCameras": 1,
"monitoringCameras": 5,
"activeIncidents": 2,
"incidentsToday": 5,
"resolvedToday": 3,
"falseAlarmToday": 1
}

GET /api/dashboard/recent-incidents

GET /api/dashboard/incident-statistics

GET /api/dashboard/camera-statistics

---

# 27. WEBSOCKET

Realtime bắt buộc.

Có channel/topic phù hợp cho:

incidents

notifications

cameras

Ví dụ events:

INCIDENT_CREATED

INCIDENT_ACKNOWLEDGED

INCIDENT_STARTED

INCIDENT_RESOLVED

INCIDENT_FALSE_ALARM

CAMERA_STATUS_CHANGED

Payload chuẩn:

{
"type": "INCIDENT_CREATED",
"timestamp": "...",
"data": {
...
}
}

Desktop và Mobile phải xử lý event mà không reload toàn bộ app.

---

# 28. DESKTOP APP LOGIN

Desktop login page gồm:

Pool Safety Monitoring

Username

Password

Remember me optional

Login

Nếu user là STAFF đăng nhập Desktop:

có thể từ chối hoặc chỉ cung cấp UI giới hạn.

Ưu tiên Desktop dành cho ADMIN.

---

# 29. DESKTOP LAYOUT

Desktop giao diện dạng control center:

+--------------------------------------------------------------+
| Pool Safety Monitoring Admin Avatar |
+----------------+---------------------------------------------+
| Dashboard | |
| Live Monitor | |
| Incidents | CONTENT |
| Cameras | |
| Users | |
| Reports | |
| Settings | |
+----------------+---------------------------------------------+

Sidebar cố định.

Header cố định.

Content scroll độc lập.

---

# 30. DASHBOARD DESKTOP

Dashboard có:

CARD:

Cameras Online

Active Incidents

Incidents Today

Resolved Today

Tiếp theo:

Live Camera Preview

Recent Incidents

Incident Statistics Chart

Camera Status

Không làm Dashboard quá rối.

---

# 31. LIVE MONITOR

Đây là màn hình quan trọng nhất.

Hiển thị Camera Grid.

Ví dụ:

+-------------+-------------+
| Camera 01 | Camera 02 |
| LIVE | LIVE |
+-------------+-------------+
| Camera 03 | Camera 04 |
| LIVE | OFFLINE |
+-------------+-------------+

Mỗi camera card hiển thị:

camera name

location

status

monitoring enabled

stream view

Click để fullscreen hoặc mở detail.

---

# 32. ACTIVE INCIDENT PANEL

Khi có incident mới:

hiển thị panel nổi bật:

DROWNING ALERT

Camera 03

Khu vực nước sâu

Detected:

19:42:12

Confidence:

94%

Status:

NEW

Buttons:

ACKNOWLEDGE

VIEW CAMERA

VIEW DETAIL

FALSE ALARM

Sau ACK:

START HANDLING

RESOLVE

---

# 33. DESKTOP INCIDENT LIST

Columns:

Time

Camera

Event

Confidence

Status

Handled By

Resolved At

Actions

Filter:

Status

Camera

Date range

Search

Pagination

Không để filter xuống quá nhiều dòng.

---

# 34. INCIDENT DETAIL

Hiển thị:

snapshot

video nếu tồn tại

camera

location

event type

confidence

detected time

status

handler

resolution note

Timeline

Ví dụ:

19:42 Detection received

19:42 Incident created

19:43 Nguyễn Văn A acknowledged

19:44 Started handling

19:48 Resolved

---

# 35. CAMERA MANAGEMENT

Admin có thể:

Add Camera

Edit Camera

Enable Monitoring

Disable Monitoring

Disable Camera

Fields:

Code

Name

Location Description

Stream URL

Status

Monitoring Enabled

Stream URL không hiển thị toàn bộ nếu chứa credential nhạy cảm.

---

# 36. USER MANAGEMENT

Admin có:

Add User

Edit User

Activate

Disable

Reset Password nếu triển khai.

Table:

Full Name

Username

Email

Role

Status

Created At

Form:

Role select:

ADMIN

STAFF

Không input text role.

---

# 37. REPORTS

Có:

Incidents Today

Last 7 Days

Last 30 Days

Resolved incidents

False alarms

Incidents by camera

Average handling time nếu dữ liệu đủ.

Biểu đồ đơn giản.

---

# 38. DESKTOP NOTIFICATIONS

Header có bell icon.

Hiển thị unread badge.

Notification dropdown.

Click notification mở incident tương ứng.

Realtime update.

---

# 39. MOBILE APP ROLE

Mobile tập trung cho STAFF.

Bottom Navigation:

Home

Alerts

Cameras

Profile

Không sao chép nguyên giao diện Desktop.

---

# 40. MOBILE LOGIN

Screen:

Logo

Pool Safety Monitoring

Username

Password

Login

Token lưu secure.

Khi access token hết hạn:

tự refresh.

Nếu refresh thất bại:

logout.

---

# 41. MOBILE HOME

Hiển thị:

Active Alerts

Cameras Online

My Active Incident

Recent Incidents

Ví dụ:

ACTIVE ALERTS

2

CAMERAS ONLINE

6 / 6

MY INCIDENT

Camera 03
Drowning
IN_PROGRESS

---

# 42. MOBILE ALERTS

Danh sách incident mới và đang xử lý.

Card:

DROWNING ALERT

Camera 03

Khu vực nước sâu

19:42

Confidence 94%

NEW

Click mở detail.

---

# 43. MOBILE INCIDENT DETAIL

Hiển thị:

snapshot

camera

location

detected at

confidence

status

handled by

timeline

Buttons dựa theo status:

NEW:

ACKNOWLEDGE

FALSE ALARM

ACKNOWLEDGED:

START HANDLING

RESOLVE

IN_PROGRESS:

RESOLVE

RESOLVED:

No action

Nếu người khác đang xử lý:

hiển thị:

Currently handled by Nguyễn Văn A

không cho chiếm incident.

---

# 44. MOBILE CAMERAS

Danh sách:

Camera 01

ONLINE

Camera 02

OFFLINE

Click:

camera info

stream

monitoring status

STAFF chỉ xem.

Không sửa.

---

# 45. MOBILE PROFILE

Hiển thị:

Full name

Username

Email

Role

Buttons:

Change Password

Logout

---

# 46. MOBILE REALTIME

Mobile phải nhận WebSocket event.

Khi incident mới:

hiển thị trong app realtime.

Nếu app đang mở:

hiển thị in-app notification.

Chuẩn bị abstraction để sau này tích hợp Push Notification như Firebase Cloud Messaging.

Không bắt buộc triển khai FCM trong phiên bản đầu nếu chưa cần.

---

# 47. API LAYER

Desktop và Mobile không gọi Axios tùy tiện trong component.

Tạo centralized API layer.

Ví dụ Desktop:

src/api/

authApi.ts

cameraApi.ts

incidentApi.ts

userApi.ts

notificationApi.ts

dashboardApi.ts

Mobile tương tự.

---

# 48. STATE MANAGEMENT

Dùng Zustand.

Store:

authStore

cameraStore

incidentStore

notificationStore

Không nhét toàn bộ state vào một store khổng lồ.

---

# 49. TYPES

Tạo TypeScript types dùng thống nhất:

User

Camera

DetectionEvent

Incident

IncidentHistory

Notification

DashboardSummary

ApiResponse

PageResponse

---

# 50. BACKEND DTO

Không expose JPA Entity trực tiếp.

Tạo:

LoginRequest

LoginResponse

CreateUserRequest

UpdateUserRequest

UserResponse

CreateCameraRequest

UpdateCameraRequest

CameraResponse

CreateDetectionEventRequest

DetectionEventResponse

IncidentResponse

ResolveIncidentRequest

NotificationResponse

DashboardSummaryResponse

---

# 51. BACKEND PACKAGE

Sử dụng feature-based structure:

com.poolsafety

auth/

user/

camera/

detection/

incident/

notification/

dashboard/

audit/

security/

websocket/

common/

config/

Mỗi feature có:

entity

repository

service

controller

dto

mapper nếu cần.

---

# 52. DATABASE MIGRATION

Tạo Flyway migration rõ ràng:

V1\_\_create_users.sql

V2\_\_create_refresh_tokens.sql

V3\_\_create_cameras.sql

V4\_\_create_detection_events.sql

V5\_\_create_incidents.sql

V6\_\_create_incident_history.sql

V7\_\_create_notifications.sql

V8\_\_create_audit_logs.sql

V9\_\_seed_development_data.sql

Không nhét toàn bộ schema vào một file khổng lồ nếu không cần.

---

# 53. DEVELOPMENT SEED

Dev environment tạo:

1 ADMIN

3 STAFF

6 CAMERA

10 Detection Events

10 Incidents

Notifications

History

Default Admin ví dụ:

admin

Không để password plaintext trong documentation production.

Có thể cung cấp dev password trong README nhưng phải nói rõ development only.

---

# 54. ERROR RESPONSE

Tất cả error sử dụng format thống nhất:

{
"timestamp": "...",
"status": 400,
"code": "INVALID_INCIDENT_TRANSITION",
"message": "...",
"path": "/api/..."
}

Dùng GlobalExceptionHandler.

---

# 55. VALIDATION

Validate:

email

username

password

camera code

event confidence

required fields

status

Role

Không tin dữ liệu từ frontend.

---

# 56. SECURITY

Sử dụng:

Spring Security

JWT

BCrypt

Role authorization

Environment variables

Không hardcode:

DB password

JWT secret

AI API key

Production secrets

.env.example phải được cung cấp.

---

# 57. CONCURRENCY

Đặc biệt chú ý incident acknowledge.

Ví dụ:

Staff A và Staff B cùng nhấn ACK trong cùng thời điểm.

Chỉ một người phải thành công.

Người còn lại nhận:

INCIDENT_ALREADY_ASSIGNED

Có thể dùng optimistic locking hoặc database locking phù hợp.

---

# 58. TRANSACTION

Các flow sau phải transactional:

Create Detection Event

- Create Incident
- Create IncidentHistory
- Create Notifications

Acknowledge Incident

Start Incident

Resolve Incident

False Alarm

---

# 59. PERFORMANCE

Các list API phải pagination.

Không load toàn bộ:

incidents

notifications

audit logs

history lớn

trong một request.

---

# 60. DESKTOP PROJECT STRUCTURE

desktop/

electron/

main.ts

preload.ts

src/

api/

components/

features/

auth/

dashboard/

monitor/

incidents/

cameras/

users/

reports/

notifications/

layouts/

stores/

hooks/

types/

utils/

routes/

assets/

Không bật Node integration trực tiếp trong renderer nếu không cần.

Dùng preload + contextBridge cho Electron API.

---

# 61. ELECTRON SECURITY

Electron phải:

contextIsolation = true

nodeIntegration = false

dùng preload script

không expose Node API tùy tiện

validate IPC channel

Không disable security để code cho nhanh.

---

# 62. MOBILE PROJECT STRUCTURE

mobile/

src/

api/

components/

screens/

auth/

home/

alerts/

cameras/

profile/

navigation/

stores/

hooks/

types/

utils/

services/

theme/

Không gọi API trực tiếp từ screen nếu có thể tách service.

---

# 63. SHARED DESIGN SYSTEM

Desktop và Mobile nên cùng nhận diện thương hiệu.

Ví dụ:

Primary:
Blue

Critical:
Red

Warning:
Orange

Success:
Green

Neutral:
Gray

Nhưng không hardcode màu ở nhiều nơi.

Tạo theme constants.

---

# 64. STATUS UI

Incident:

NEW

ACKNOWLEDGED

IN_PROGRESS

RESOLVED

FALSE_ALARM

Camera:

ONLINE

OFFLINE

DISABLED

Các status phải dùng badge thống nhất.

---

# 65. LOADING / EMPTY / ERROR STATES

Mọi page phải có:

Loading

Empty State

Error State

Không để màn hình trống khi request fail.

---

# 66. API CONFIG

Desktop:

API_BASE_URL lấy từ environment/config.

Mobile:

API_BASE_URL lấy từ environment.

Không hardcode localhost ở mọi file.

---

# 67. DESKTOP DEV

Development:

Backend:

http://localhost:8080

Desktop Electron:

Vite dev server.

Production:

configurable backend URL.

---

# 68. MOBILE LOCAL NETWORK

Khi chạy React Native trên điện thoại thật:

không giả định localhost là Backend.

Hỗ trợ env:

API_BASE_URL=http://192.168.x.x:8080

README phải giải thích điều này.

---

# 69. SWAGGER

Backend có:

/swagger-ui

/api-docs

Document:

Auth

Users

Cameras

Detection Events

Incidents

Notifications

Dashboard

---

# 70. TESTING BACKEND

Viết tests cho:

Auth

Refresh Token

Camera Service

Create Detection Event

Incident transition

Incident concurrency

Notifications

Role security

Quan trọng nhất:

NEW → ACKNOWLEDGED PASS

ACKNOWLEDGED → IN_PROGRESS PASS

IN_PROGRESS → RESOLVED PASS

NEW → FALSE_ALARM PASS

RESOLVED → NEW FAIL

FALSE_ALARM → ACKNOWLEDGED FAIL

---

# 71. DESKTOP TEST FLOW

Test:

Admin login

Dashboard load

Camera list load

Create Camera

Edit Camera

Detection Event received

Realtime Incident popup

Acknowledge

Start

Resolve

Statistics update

Notification badge update

---

# 72. MOBILE TEST FLOW

Test:

Staff login

Home load

Receive realtime incident

Open alert

Acknowledge

Start Handling

Resolve

Other clients realtime update

Logout

---

# 73. MOCK AI

Vì chưa có AI thật:

Tạo development endpoint hoặc script riêng để giả lập DetectionEvent.

Ví dụ:

scripts/mock-ai-event.sh

hoặc:

Postman collection.

Không tạo nút Mock AI trong production UI.

Có thể tạo development-only page nếu cần.

---

# 74. POSTMAN

Tạo Postman collection gồm:

Login

Refresh

Create Camera

List Camera

Create Detection Event

List Incidents

Acknowledge

Start

Resolve

False Alarm

Notifications

Dashboard

---

# 75. DOCKER

Có docker-compose cho development nếu hợp lý:

postgres

backend

Có thể để Desktop và Mobile chạy local ngoài Docker.

---

# 76. ROOT PROJECT STRUCTURE

pool-safety-monitoring/

backend/

desktop/

mobile/

scripts/

docs/

docker-compose.yml

README.md

.env.example

.gitignore

---

# 77. ROOT README

README phải có:

Project overview

Architecture

Technology stack

Folder structure

Requirements

Database setup

Environment variables

How to start PostgreSQL

How to run Backend

How to run Desktop

How to run Mobile

How to login

How to simulate AI event

How to test WebSocket

How to build Desktop EXE

How to build Android APK

Common errors

---

# 78. DESKTOP BUILD

Cấu hình Electron Builder hoặc tool phù hợp.

Hỗ trợ:

npm run dev

npm run build

npm run dist

Output có installer Windows.

---

# 79. MOBILE BUILD

Hướng dẫn:

npm install

npm run android

và cách build APK release.

Nếu dùng Expo thì phải nêu rõ.

Ưu tiên React Native CLI nếu cần native control cao.

Nếu chọn Expo vì đơn giản thì phải đảm bảo WebSocket, storage và các requirement hoạt động.

---

# 80. CODE QUALITY

Không viết:

god class

god component

repository logic trong controller

HTTP request lặp lại

duplicate DTO không cần thiết

hardcoded fake data production

inline huge CSS

business logic trong React component

---

# 81. REUSE COMPONENTS

Desktop phải có shared component:

Button

Input

Select

Modal

Table

Pagination

StatusBadge

CameraCard

IncidentCard

LoadingSpinner

EmptyState

ConfirmDialog

Toast

PageHeader

FilterBar

Mobile tương tự theo React Native.

---

# 82. BUSINESS FLOW CUỐI CÙNG

Flow bắt buộc phải hoạt động end-to-end:

STEP 1

Admin login Desktop.

STEP 2

Admin tạo:

CAM-01

Camera khu vực nước sâu.

STEP 3

Staff login Mobile.

STEP 4

Mock AI gửi:

POST /api/detection-events

{
"cameraId": "<camera-id>",
"eventType": "DROWNING",
"confidence": 0.94,
"detectedAt": "..."
}

STEP 5

Backend:

Create DetectionEvent.

STEP 6

Backend:

Create Incident NEW.

STEP 7

Desktop nhận WebSocket:

INCIDENT_CREATED.

STEP 8

Desktop hiển thị critical alert.

STEP 9

Mobile nhận event realtime.

STEP 10

Staff mở incident.

STEP 11

Staff nhấn ACKNOWLEDGE.

STEP 12

Backend:

NEW → ACKNOWLEDGED.

STEP 13

handled_by = Staff.

STEP 14

Desktop ngay lập tức hiện:

Handled by Staff Name.

STEP 15

Staff nhấn:

START HANDLING.

STEP 16

Backend:

ACKNOWLEDGED → IN_PROGRESS.

STEP 17

Staff nhấn:

RESOLVE.

STEP 18

Backend:

IN_PROGRESS → RESOLVED.

STEP 19

Desktop cập nhật realtime.

STEP 20

Dashboard statistics cập nhật.

STEP 21

Incident History phải chứa đầy đủ timeline.

Nếu toàn bộ flow trên chưa hoạt động thì dự án CHƯA hoàn thành.

---

# 83. ƯU TIÊN TRIỂN KHAI

PHASE 1

Project structure

Database

Flyway

PHASE 2

Security

Auth

Refresh Token

PHASE 3

Users

PHASE 4

Cameras

PHASE 5

Detection Events

PHASE 6

Incident State Machine

PHASE 7

Notifications

WebSocket

PHASE 8

Dashboard

PHASE 9

Desktop Electron + React

PHASE 10

React Native Mobile

PHASE 11

Tests

PHASE 12

Docker

Postman

Documentation

Build configuration

---

# 84. QUAN TRỌNG KHI CODING AGENT THỰC HIỆN

Không chỉ tạo skeleton.

Phải thực sự implement.

Không tạo TODO thay cho logic chính.

Không bỏ trống service.

Không trả mock data khi API thật đã có.

Không chỉ tạo UI mà không connect API.

Không chỉ tạo API mà Desktop/Mobile không gọi.

Không bỏ qua authentication.

Không bỏ qua WebSocket.

Không bỏ qua database migration.

Không bỏ qua error handling.

Không bỏ qua tests cho các flow quan trọng.

---

# 85. NẾU PROJECT HIỆN TẠI ĐÃ CÓ CODE

Trước tiên:

1. Scan toàn bộ project.
2. Hiểu cấu trúc hiện tại.
3. Tìm backend/frontend/mobile code đã tồn tại.
4. Tìm component tái sử dụng được.
5. Tìm API đã tồn tại.
6. Tìm migration/database hiện có.
7. Không rewrite project nếu không cần.
8. Refactor có kiểm soát.
9. Không tạo duplicate component.
10. Không phá chức năng đang chạy.

---

# 86. KẾT QUẢ CUỐI CÙNG

Project cuối cùng phải có:

backend chạy được

PostgreSQL schema hoàn chỉnh

Flyway migrations

JWT auth

role security

camera management

detection event endpoint

incident management

incident history

notifications

WebSocket

dashboard

Electron React Desktop App

React Native Mobile App

Postman Collection

Seed Data

Tests

Docker Development Setup

README

.env.example

Desktop build configuration

Android build configuration

Không dừng lại ở mức prototype giao diện.

Mục tiêu là một hệ thống chạy end-to-end.

---

# FINAL ARCHITECTURE

POOL SAFETY MONITORING SYSTEM

                 CAMERA
                    |
                    v
              AI SERVICE
               (Future)
                    |
                    | Detection Event
                    v
          SPRING BOOT BACKEND
             /           \
            /             \
      PostgreSQL       WebSocket
                            |
                  +---------+----------+
                  |                    |
                  v                    v

        ELECTRON DESKTOP       REACT NATIVE MOBILE
          React + TS                 React + TS

             ADMIN                    STAFF

Phạm vi cuối cùng:

ONE POOL

ONE BACKEND

ONE DATABASE

ONE DESKTOP ADMIN APP

ONE MOBILE STAFF APP

REALTIME INCIDENT MANAGEMENT

FUTURE AI INTEGRATION

Hãy triển khai dự án hoàn chỉnh theo kiến trúc trên và ưu tiên tính đúng đắn, chạy được end-to-end, cấu trúc sạch, dễ mở rộng AI sau này.
