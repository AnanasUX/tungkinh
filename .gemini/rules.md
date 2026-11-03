# QUY TẮC PHÁT TRIỂN & VẬN HÀNH DỰ ÁN CHÙA AN NHIÊN
> **Tham chiếu tài liệu cấu hình chuẩn**: [SYSTEM_CONFIG.md](file:///d:/Python/tungkinh/SYSTEM_CONFIG.md)

Khi thực hiện bất kỳ tác vụ nào trong không gian làm việc này, AI Agent BẮT BUỘC phải tuân thủ:

1. **Quy định Xoay Ngang Màn Hình (Orientation Guard)**:
   - Toàn bộ thiết bị Mobile và Tablet bắt buộc phải xoay ngang (`Landscape`) khi vào Chánh Điện.
   - Nếu thiết bị đang ở chế độ Dọc (`Portrait`), phải hiển thị màn hình chuyển hướng `#orientation-guard-overlay`.
   - **Riêng PC (Desktop & Laptop có chuột/bàn phím `pointer: fine` và màn hình $\ge 1024\text{px}$)**: Tuyệt đối không hiển thị màn hình chuyển hướng, vào thẳng Chánh Điện ngay lập tức.

2. **Chống Cắt Giao Diện (Zero Cut-Off Layout)**:
   - `#temple-stage`: Luôn dùng `width: 100% !important; height: 100% !important; max-width: 100% !important; aspect-ratio: auto !important;`. Không dùng `calc(100vh * 16 / 9)`.
   - Thanh đáy 14 nút công cụ (`#bottom-dock-scroll`): Bố trí theo lưới cân đối **2 hàng $\times$ 7 cột** (`max-width: 980px`). Không bao giờ làm rớt hoặc cắt nút.
   - Tọa độ Bồ Đoàn: Hàng 0 tại `56%`, Hàng 1 tại `71%`. Cách thanh đáy tối thiểu 40px.

3. **Cơ Chế Máy Chủ & Chat Đạo Tràng**:
   - Máy chủ `server.js` chạy trên cổng `3000`, lưu trữ bền vững lịch sử tin nhắn trong `data/sanctuary_db.json`.
   - Module chat đạo tràng [js/room-chat.js](file:///d:/Python/tungkinh/js/room-chat.js) kích hoạt từ `#room-chat-header-button`.
   - Lớp Realtime [js/realtime-sanctuary.js](file:///d:/Python/tungkinh/js/realtime-sanctuary.js) ưu tiên kết nối máy chủ cục bộ khi chạy trên localhost.

4. **Bảo Tồn Toàn Bộ Nghiệp Vụ Cốt Lõi**:
   - Giữ nguyên popup nhập thông tin người dùng `#registration-gate-modal` khi vào phiên.
   - Giữ nguyên âm thanh Web Audio API và động cơ 3D Three.js WebGL.
   - Chỉ gọi `requestFullscreen(true)` khi có cử chỉ tương tác người dùng (`userGesture`).
