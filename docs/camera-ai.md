# Video trên máy và mô hình AI cho từng camera

## Cập nhật ứng dụng

Dừng backend cũ bằng Ctrl+C trong terminal đang chạy rồi khởi động lại:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-backend.ps1
```

Migration mới bổ sung cấu hình AI cho camera, giữ dữ liệu hiện có. Không cần reset database. Khởi động lại Desktop nếu đang dùng bản build cũ:

```powershell
npm run desktop
```

## Chọn video trên máy

Vào **Cameras → Add camera** hoặc **Edit**:

1. Nhập Code, Name và Location.
2. Chọn **Loại nguồn video → Video trên máy tính**.
3. Bấm **Chọn video trên máy**, chọn file MP4, WebM hoặc MOV, tối đa 1 GB. Khuyến nghị MP4 H.264 để cả Electron và Android phát được. MOV/codec không được thiết bị hỗ trợ có thể không phát được; hệ thống không tự chuyển mã.
4. Chọn mô hình AI, trạng thái **ONLINE**, bật **Enable monitoring**, rồi **Save camera**.

Video được tải lên và lưu trên máy backend, nên Mobile cũng xem được qua mạng. Không nhập `D:\...` hoặc `file://...` vào ô Stream URL. Khi sửa camera, không chọn file mới sẽ giữ video hiện có. Đổi lại loại nguồn URL nếu muốn dùng camera IP/RTSP.

Nguồn local được hiển thị trong trang chi tiết và Live monitor. Video trong trình phát lặp lại; AI phân tích một lượt từ đầu đến cuối, độc lập với thao tác pause/seek trong trình phát. Khi AI báo **FINISHED**, tắt rồi bật monitoring để phân tích lại từ đầu.

## Chọn mô hình cho từng camera

| Lựa chọn | Checkpoint | Hành vi |
| --- | --- | --- |
| Không dùng AI | Không cần | Chỉ phát video |
| YOLO26n | Không bắt buộc | Dùng `yolo26n.pt` chính thức; có thể chọn checkpoint đã huấn luyện riêng |
| YOLO đã huấn luyện | `.pt` / `.onnx` | Checkpoint Ultralytics detection tương thích |
| Drowning Detection / INO / ConvLSTM | `.pt` / `.pth` / `.onnx` | Dùng bộ nạp và kiến trúc trong `Desktop_Drowning_Detection` |

Mỗi camera lưu riêng mô hình, checkpoint và ngưỡng tin cậy. Thay đổi cấu hình sẽ dừng tiến trình xử lý cũ và tạo tiến trình mới; bộ nhớ thời gian của các camera tách biệt.

Trên Desktop, bấm **Chọn mô hình** ngay ở dòng camera. Trong cửa sổ cấu hình, bấm **Chọn mô hình đã huấn luyện** để mở hộp thoại chọn file trên máy, chọn loại mô hình phù hợp rồi **Save camera**. Tên file đã chọn xuất hiện dưới nút; checkpoint được tải lên backend và gắn riêng với camera đó. Trong form thêm camera mới cũng có nút này, kể cả khi chưa bật AI.

YOLO26n mặc định nhận diện các đối tượng phổ thông, không phân loại đuối nước. Chỉ checkpoint có nhãn `drown` hoặc `drowning` mới phát cảnh báo DROWNING. Nhãn `Not Drowning`, `swim`, `person`, `person_in_water` không tạo cảnh báo đuối nước. Worker dùng tên lớp của checkpoint, không mặc định lớp 0 hay lớp 1 là đuối nước. YOLO chuẩn cần ít nhất 8/15 khung hình suy luận gần nhất vượt ngưỡng, có khoảng cách 30 giây giữa các cảnh báo của cùng camera. Bộ nạp tham khảo còn áp dụng chính sách lấy mẫu, warm-up và bộ nhớ của mô hình.

Nếu dùng `D:\Download\yolo26-ino-convlstm.pt`, chọn **Drowning Detection / INO / ConvLSTM**; checkpoint tùy biến này cần bộ nạp tham khảo thay vì bộ nạp YOLO chuẩn.

## Chạy AI worker — terminal riêng

Cài dependencies vào môi trường Python đang sử dụng:

```powershell
python -m pip install -r ai/requirements.txt
```

Backend phải đang chạy. Chạy đúng một AI worker cho một backend:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-ai.ps1
```

Với các checkpoint tùy biến của dự án tham khảo, cài thêm dependencies của dự án đó vào cùng Python và khai báo đường dẫn:

```powershell
python -m pip install -r D:/DEV/Desktop_Drowning_Detection/requirements.txt
powershell -ExecutionPolicy Bypass -File scripts/start-ai.ps1 `
  -ReferenceProject 'D:\DEV\Desktop_Drowning_Detection'
```

Có thể chỉ định môi trường Python bằng `-Python 'D:\path\to\python.exe'`. Mặc định chạy CPU; nếu PyTorch trong môi trường hỗ trợ CUDA, thêm `-Device 'cuda:0'`.

YOLO26n mặc định tải weights chính thức về `.runtime/ai-models/yolo26n.pt` ở lần đầu nếu chưa có. Dùng checkpoint đã chọn để chạy offline. Model chỉ được nạp khi có camera ONLINE, bật monitoring và đã chọn AI.

Thông tin mô hình và checkpoint mặc định: [tài liệu YOLO26 chính thức của Ultralytics](https://docs.ultralytics.com/models/yolo26/).

Worker đồng bộ cấu hình mỗi 3 giây. Trong danh sách Cameras, cột AI hiển thị `LOADING`, `RUNNING`, `ERROR`, `FINISHED` hoặc `STOPPED`, kèm số khung hình đã xử lý. Nếu worker chưa chạy, hiển thị **Chờ AI worker**. Lỗi checkpoint/nguồn video không được hiển thị thành trạng thái chạy thành công. Sau khi sửa môi trường hoặc checkpoint lỗi, tắt rồi bật monitoring để thử lại.

Cảnh báo DROWNING được gửi qua API hiện có, tạo incident và cập nhật Desktop/Mobile bằng realtime. Video hiển thị là video nguồn; phiên bản này chưa vẽ bounding box lên trình phát hay đồng bộ vị trí tua video với worker.

## Lưu trữ và triển khai

- File upload local được lưu trong `.runtime/media` ở thư mục gốc khi dùng launcher backend chuẩn. Có thể đổi bằng `MEDIA_DIRECTORY` với đường dẫn tuyệt đối.
- AI worker cần đọc được đường dẫn file trên máy backend. Cách chạy trong hướng dẫn dùng backend Java và worker trên cùng máy Windows. Nếu chạy backend trong Docker, cần triển khai worker cùng môi trường file/mount; không dùng đường dẫn `/app/media/...` của container từ worker Windows.
- Docker Compose giữ video/checkpoint trong volume `media_data`. Không xóa volume này nếu muốn giữ file upload.
- Chỉ ADMIN được upload và sửa mô hình. Cấu hình nội bộ chứa đường dẫn file/nguồn camera chỉ được cung cấp khi có `X-AI-SERVICE-KEY`. Playback dùng URL UUID khó đoán để trình phát native hỗ trợ HTTP Range; người có URL này có thể xem video. Model không có URL tải công khai.
- Chỉ dùng checkpoint từ nguồn bạn tin cậy; checkpoint PyTorch có thể chứa mã Python khi được nạp.
- Xóa/reset dữ liệu DB không tự xóa file upload. File cũ được giữ để tránh làm hỏng nguồn đang dùng; có thể dọn sau khi xác định không còn camera tham chiếu.
