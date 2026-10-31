# CHÙA AN NHIÊN – HỆ THỐNG TU TẬP & LỄ PHẬT TRỰC TUYẾN 🌸🙏卐

> Không gian tâm linh thanh tịnh, trang nghiêm dành cho Phật tử và hành giả tu tập trực tuyến: Gõ Mõ, Thỉnh Đại Hồng Chung, Tụng Kinh Tự Động, Dâng Hương, Đảnh Lễ và Tích Lũy Công Đức.

---

## 🏛️ TỔNG QUAN HỆ THỐNG & KIẾN TRÚC

Dự án được xây dựng theo chuẩn **Vanilla Web Standards (HTML5 Semantic, CSS3 Modern, Vanilla JavaScript ES6+)**, hoạt động độc lập không phụ thuộc thư viện nặng ngoài, tối ưu hóa hiệu năng 60 FPS trên máy tính (Chrome, Edge) và thiết bị di động (Android, iOS Retina).

```
tungkinh/
│
├── index.html            # Giao diện Chánh điện, Tôn tượng Phật, Altar & Modals
├── css/
│   └── style.css         # Phong cách thiền môn trang nhã, hiệu ứng nến, hào quang, responsive
├── js/
│   ├── audio.js          # Web Audio API Synthesizer (Tiếng Mõ, Đại Hồng Chung & Nhạc Thiền)
│   ├── canvas-effects.js # Động cơ hạt vật lý: Khói trầm hương, bụi kim quang, hào quang Phật, sóng chuông
│   ├── scriptures.js     # Kho tàng kinh văn: Chú Đại Bi, Bát Nhã Tâm Kinh, Kinh Dược Sư, Sám Hối
│   ├── state.js          # Quản lý 8 phân vùng trạng thái độc lập, Atomic transaction, LocalStorage
│   └── app.js            # Điều khiển giao diện, HUD, phím tắt và nghiệp vụ hành giả
└── README.md             # Tài liệu kỹ thuật dự án
```

---

## ✨ TÍNH NĂNG NỔI BẬT

### 1. Âm Thanh Vật Lý Độc Lập (Web Audio API Synthesizer)
- **Tiếng Mõ Chùa Gõ Cốc Cốc**: Mô phỏng âm học buồng gỗ rỗng với bộ lọc Bandpass cộng hưởng và transient gõ dùi, độ trễ 0ms.
- **Đại Hồng Chung Ngân Vang**: Tần số Solfeggio 216Hz với 7 tầng họa âm đồng cổ truyền kéo dài 6-8 giây êm dịu, kèm rung sóng tự nhiên (LFO vibrato).
- **Âm Thiền Tịnh Nền (Ambient Drone)**: Hòa âm ngũ cung thư giãn tâm trí, giúp định tâm sâu sắc.

### 2. Hiệu Ứng Thị Giác Đỉnh Cao (Canvas Physics Simulation)
- **Khói Hương Trầm Uốn Lượn**: Mô phỏng hạt khói bốc lên từ lư hương theo quỹ đạo sóng sin ngẫu nhiên.
- **Hào Quang Phật Quang Chiếu Diệu**: Vầng sáng xoay nhẹ nhàng tỏa tia kim quang sau tôn tượng Đức Thế Tôn.
- **Sóng Âm Chuông Lan Tỏa**: Các vòng sóng âm kim quang nở rộng khi thỉnh Đại Hồng Chung.
- **Phước Lành Bay Bổng**: Chữ Vạn (卐) và dòng chữ "+1 Phước Đức" nhẹ nhàng thăng hoa khi gõ mõ.

### 3. Nghiệp Vụ Hành Giả Chuẩn Mực (Đáp ứng đầy đủ Test Cases)
- **Case 01 – Truy Cập Lần Đầu**: Bắt buộc ghi danh quy hướng Tam Bảo trước khi mở quyền năng tu tập cá nhân; không tự sinh hồ sơ giả.
- **Case 02 – Ghi Danh Hợp Lệ**: Kiểm tra họ tên, tính tuổi chính xác từ ngày sinh (chặn ngày tương lai, không lấy tuổi mặc định ghi đè lỗi), chọn pháp tướng avatar, ghi nhận tâm nguyện, tự động cấp Bồ đoàn trống đầu tiên.
- **Case 03 – Chỉnh Sửa Hồ Sơ**: Bảo toàn tuyệt đối ID hành giả, bảo toàn Bồ đoàn hiện tại, không cộng lại điểm ghi danh, không reset thời gian tu tập.
- **Case 04 – Chọn Bồ Đoàn**: Chỉ cho phép chọn Bồ đoàn trống; thực hiện giao dịch nguyên tử (Atomic transaction) giải phóng vị trí cũ trước khi chiếm vị trí mới.
- **Case 05 – Hết Chỗ Trống**: Thông báo nhã nhặn, không ghi đè dữ liệu người khác.
- **Case 06 – Đổi Bồ Đoàn Liên Tục**: Cơ chế Debounce / Throttling khóa trạng thái chống spam click.

### 4. Tụng Kinh Tự Động & Cuộn Nhịp Mõ
- Hỗ trợ các bản kinh phổ biến: **Chú Đại Bi, Bát Nhã Ba La Mật Đa Tâm Kinh, Dược Sư Quán Đảnh Chân Ngôn, Kinh Sám Hối & Hồi Hướng**.
- Tính năng **Tự Động Cuộn Kinh** theo từng câu kệ, đồng bộ nhịp gõ mõ tự động theo tốc độ tùy chỉnh (Chậm / Vừa / Nhanh).

---

## ⌨️ BẢNG PHÍM TẮT TIỆN DỤNG

| Phím Tắt | Chức Năng |
| :---: | :--- |
| **`Space`** hoặc **`M`** | Gõ Mõ định tâm (+1 Phước) |
| **`C`** | Thỉnh Đại Hồng Chung ngân vang (+5 Phước) |
| **`L`** | Đảnh Lễ Đức Phật (+10 Phước) |
| **`K`** | Mở Kinh Thư & Tụng Kinh Tự Động |
| **`H`** | Cúng Dường (Hương, Hoa, Đèn Tâm Đăng) |
| **`B`** | Mở Sổ Vàng Công Đức & Nhật Ký Tu Tập |
| **`Esc`** | Đóng tất cả cửa sổ Modal |

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY THỬ

1. Tải hoặc clone repository về máy:
   ```bash
   git clone https://github.com/AnanasUX/tungkinh.git
   ```
2. Mở trực tiếp file `index.html` bằng trình duyệt web (Google Chrome, Microsoft Edge, Safari, Firefox), hoặc sử dụng Live Server trong VS Code:
   ```bash
   # Nếu dùng npx serve:
   npx serve .
   ```
3. Đắm chìm trong không gian thanh tịnh của **Chùa An Nhiên**! 🙏
