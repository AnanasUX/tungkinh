# 🏛️ HỆ THỐNG TU TẬP CHÙA AN NHIÊN — SYSTEM CONFIGURATION & AGENT RUNBOOK
> **Tài liệu cấu hình chuẩn hóa hệ thống (Standard Configuration & Runtime Execution Manual)**.  
> *Bất kỳ tác nhân AI (AI Agent), lập trình viên hoặc tiến trình tự động nào khi tiếp nhận mã nguồn dự án BẮT BUỘC phải đọc kỹ và tuân thủ tuyệt đối các quy chuẩn kỹ thuật trong tệp này trước khi tiến hành thực thi hoặc chỉnh sửa.*

---

## 1. TỔNG QUAN HỆ THỐNG & TRIẾT LÝ VẬN HÀNH

- **Tên dự án**: Chùa An Nhiên — Không Gian Tu Tập & Lễ Phật Trực Tuyến.
- **Mục tiêu**: Cung cấp không gian tâm linh thanh tịnh, trang nghiêm cho Phật tử và hành giả tu tập trực tuyến: Gõ Mõ Tịnh Tâm, Thỉnh Đại Hồng Chung, Tụng Kinh Tự Động, Dâng Hương, Đảnh Lễ, Xin Quẻ Xăm, Thả Hoa Đăng, Phóng Sanh, Đồng Tụng và Chat Đạo Tràng thời gian thực.
- **Nền tảng công nghệ**:
  - **Frontend**: Vanilla Web Standards (HTML5 Semantic, CSS3 Modern Flexbox/Grid/Tailwind Classes, Vanilla JavaScript ES6+, Web Audio API Synthesizer, Canvas 2D Particles, Three.js r128 WebGL).
  - **Backend Server**: Node.js (`http`, `fs`, `path`, SSE Stream, WebSocket `ws`).
  - **Realtime Mesh**: Kiến trúc kết hợp đa tầng:
    1. *Dedicated Local Node Server* (`server.js` trên `localhost:3000`).
    2. *Supabase Realtime Cloud Sync* (qua `@supabase/supabase-js` v2).
    3. *Universal Fallback Mesh* (BroadcastChannel + LocalStorage Events đa tab).

---

## 2. CẤU HÌNH MÁY CHỦ & MÔI TRƯỜNG THỰC THI (SERVER CONFIG)

### 2.1. Cổng Dịch Vụ & Biến Môi Trường
- **Port mặc định**: `3000` (hoặc cấu hình qua biến `PORT`).
- **Địa chỉ truy cập**:
  - Web UI: `http://localhost:3000`
  - REST State API: `GET http://localhost:3000/api/sanctuary/state`
  - REST Event API: `POST http://localhost:3000/api/sanctuary/event`
  - SSE Stream: `GET http://localhost:3000/api/sanctuary/events`
  - WebSocket Server: `ws://localhost:3000`
- **File Database cục bộ**: `data/sanctuary_db.json` (tự động tạo và lưu trữ liên tục trạng thái 12 bồ đoàn, danh sách đạo hữu, tiến trình tụng niệm và lịch sử chat).

### 2.2. Lệnh Khởi Động & Thực Thi
```bash
# Cài đặt thư viện phụ thuộc
npm install

# Khởi động máy chủ chính
npm start
# Hoặc:
node server.js
```

---

## 3. CẤU HÌNH GIAO DIỆN & QUY TẮC ĐA MÀN HÌNH BẮT BUỘC (RESPONSIVE & ORIENTATION)

### 3.1. Trực Tiếp Vào Chánh Điện (Direct Sanctuary Access & Zero Interruption)
> **NGUYÊN TẮC CỐT LÕI**: Người dùng khi vào chùa phải được **bước thẳng vào Chánh Điện thanh tịnh ngay lập tức**: Thấy ngay bàn thờ Tam Bảo, tượng Phật, lư hương, hoa sen, ánh nến, 12 bồ đoàn và thanh công cụ.

1. **Vào Thẳng Không Bị Chặn Cửa**:
   - Lớp màn hình chuyển hướng `#orientation-guard-overlay` được ẩn hoàn toàn (`display: none !important`), tuyệt đối **không chặn cửa hay hiển thị thông báo "bảo xoay ngang màn hình"** gây phiền toái cho người dùng.
   - Không tự động ép bật popup `#registration-gate-modal` (Sớ Ghi Danh) khi vừa tải trang. Hệ thống tự động nạp phiên hoặc gán danh xưng Đạo Hữu an lành để người dùng có thể lễ Phật, gõ mõ, tụng kinh ngay. Khi người dùng muốn xem/sửa hồ sơ, họ có thể chủ động bấm biểu tượng `📜` trên Header.
2. **Hỗ Trợ Toàn Diện Cả Chế Độ Dọc (Portrait) & Ngang (Landscape)**:
   - **Chế độ Ngang (Landscape)**: 12 bồ đoàn hiển thị 2 hàng $\times$ 6 cột cân xứng, tầm nhìn Chánh Điện khoáng đạt.
   - **Chế độ Dọc (Portrait)**: 12 bồ đoàn tự động sắp xếp 3 hàng $\times$ 4 cột (`seatY = 58 + row * 12`), bảo toàn $100\%$ tính năng chiêm bái trên mọi thiết bị di động mà không cần phải xoay máy.
   - Nút Toàn Màn Hình (`⛶`) trên Header sẵn sàng phục vụ khi người dùng chủ động muốn mở rộng không gian.

### 3.2. Không Bao Giờ Cắt Giao Diện & Tối Ưu Cảm Ứng Mobile (Mobile Touch Optimization)
- **Tỉ lệ Chánh Điện (`#temple-stage`)**: Phải sử dụng `width: 100% !important; height: 100% !important; max-width: 100% !important; aspect-ratio: auto !important;`. Tuyệt đối **không** dùng `max-width: calc(100vh * 16/9)` vì sẽ gây ra viền đen (pillarboxing) và bóp nghẹt không gian trên các smartphone màn hình dài (19.5:9, 20:9).
- **Thanh Đảo Thiền Hành Động (`#bottom-dock-scroll`)**:
   - **Trên Mobile Ngang (Điện thoại màn hình nhỏ $\le 560\text{px}$ chiều cao hoặc $\le 950\text{px}$ chiều rộng)**:
     - Chuyển sang thanh trượt cảm ứng siêu mượt (`overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; display: flex`).
     - Chiều cao nút bấm: $36\text{px}$, chữ $11.5\text{px}$ đậm, bo tròn $9999\text{px}$, `min-width: max-content`, đệm ngón tay chuẩn công thái học di động.
     - Tuyệt đối **không ép 14 nút vào lưới 2x7 chỉ cao 21px** trên điện thoại vì ngón tay người dùng không thể chạm chính xác.
     - Các nút cốt lõi đặt đầu thanh: *Việc Lành · Gõ Mõ · Lễ Phật · Dâng Hương · Đồng Tụng · 🎙️ Micro* giúp ngón tay cái chạm bấm tức thì, vuốt ngang êm ái để chọn thêm các pháp môn khác.
   - **Trên Màn Hình Lớn (Tablet, Laptop, PC $\ge 1024\text{px}$)**:
     - Duy trì bố cục lưới cân đối hoặc thanh công cụ chuẩn Chánh Điện.
- **Tọa Độ Bồ Đoàn (`renderSanctuaryFloor`)**:
   - Hàng bồ đoàn trên (Row 0): `seatY = 55% - 56.5%`.
   - Hàng bồ đoàn dưới (Row 1): `seatY = 70% - 71.5%`.
   - Khoảng trống từ chân bồ đoàn hàng dưới đến đỉnh thanh công cụ luôn đạt tối thiểu $30\text{px} - 40\text{px}$, không bao giờ để thanh đáy đè lên người ngồi hoặc bảng tên bồ đoàn.

### 3.3. Đàm Thoại Giọng Nói Thời Gian Thực (Realtime Voice / Mic Engine)
- Hệ thống truyền dẫn âm thanh giọng nói 2 chiều (WebRTC Mesh + Web Audio API Opus Chunk Broadcast):
  1. **WebSocket Stream Tức Thời**: Mọi thiết bị truy cập qua mạng nội bộ hoặc Internet kết nối thẳng vào luồng WebSocket của Node server (`ws://.../ws`) sử dụng gói tin phụ thuộc `ws` chuẩn hóa.
  2. **Chu Kỳ Thu Âm Tự Thân (Self-Contained Looping Slices)**: Thu âm từng lát cắt 400ms độc lập, đảm bảo 100% gói tin âm thanh xuất ra đều mang đầy đủ container header (EBML/moov), loại bỏ hoàn toàn lỗi không nhận dạng định dạng khi giải mã.
  3. **Giải Mã Web Audio API Trực Tiếp & Lên Lịch Phát (Timeline Scheduler)**: Toàn bộ luồng âm thanh được giải mã qua `AudioEngine.ctx` (`decodeAudioData` + `BufferSource.start(nextScheduledTime)`), tạo dòng âm thanh liền mạch, không giật cục, không bị chặn bởi Autoplay Policy trên iOS Safari và Android Chrome.
  4. **Nút Bật Mic Nhanh Đa Vị Trí**:
     - Nút Mic trên thanh đáy Chánh Điện (`#btn-dock-mic`).
     - Nút Mic trên Header của hộp thoại Chat (`#room-header-mic-btn`).
     - Nút Mic trong Sidebar thành viên kèm thước đo âm lượng nhấp nhô (`.room-voice-meter`).

---

## 4. CẤU HÌNH DỮ LIỆU & GIAO THỨC CHAT THỜI GIAN THỰC

### 4.1. Room Chat Protocol & Giao Diện Không Đè Lấn ([js/room-chat.js](file:///d:/Python/tungkinh/js/room-chat.js))
- Nút kích hoạt trên Header: `#room-chat-header-button` (icon bong bóng thoại viền xanh cyan ngọc bích).
- Panel chat: `#room-chat-modal` kiến trúc kính trầm hương thiền tịnh (Imperial Gold Zen Glassmorphism).
- **Quy tắc chống đè lấn (Zero Overlapping Invariant)**:
  - Khung thoại `.room-chat-shell` cố định theo Flexbox hướng dọc (`flex-direction: column; overflow: hidden`), chiều cao giới hạn `min(650px, 94dvh)`.
  - Danh sách tin nhắn `.room-chat-messages` nằm trong khoang cuộn độc lập (`flex: 1 1 0%; min-height: 0; overflow-y: auto`).
  - Thanh lời lành `.room-dharma-pills` (1 hàng duy nhất trượt ngang, không bao giờ rơi dòng đè chữ).
  - Khung soạn thảo `.room-chat-composer` cố định vững chắc ở đáy (chiều cao 46px - 52px), không bao giờ bị trôi hoặc che lấp tin nhắn.
  - Trên màn hình nhỏ hoặc xoay ngang ($\le 840\text{px}$ hoặc $\le 540\text{px}$ chiều cao): Tự động tách thành các tab thông minh (`🌐 Đạo Tràng Toàn Cầu`, `🔒 Nhắn Tin Riêng`, `👥 Đồng Tu & Mã Phòng`) — khi xem chat thì khung chat chiếm 100% diện tích, khi xem thành viên thì chiếm 100% diện tích, triệt tiêu hoàn toàn tình trạng sidebar 280px chèn ép làm vỡ khung chat.
- Sự kiện phát sóng:
  ```json
  {
    "type": "ROOM_CHAT",
    "roomId": "global-sanctuary",
    "channel": "lobby",
    "senderId": "user-uuid",
    "name": "Thích Tâm An",
    "text": "Nam Mô A Di Đà Phật 🙏",
    "timestamp": 1730600000000
  }
  ```
- **Lưu trữ bền vững**: Máy chủ lưu 300 tin nhắn gần nhất trong `sanctuaryDB.chatHistory`. Khi client kết nối, nhận ngay 120 tin nhắn gần nhất để hiển thị liền mạch.

### 4.2. Bồ Đoàn & Trạng Thái Đồng Bộ ([js/realtime-sanctuary.js](file:///d:/Python/tungkinh/js/realtime-sanctuary.js))
- Tổng số bồ đoàn Chánh điện mặc định: 12 vị trí (Đánh số từ `#1` đến `#12`).
- Mỗi vị trí lưu: `seatNo`, `occupied`, `isUser`, `name`, `dharmaName`, `points`, `avatar`, `remoteClientId`, `lastActive`.
- Trạng thái hành giả:
  - Khi chưa đăng ký: Tự động mở popup sớ ghi danh `#registration-gate-modal` sau 100ms khi vào hệ thống.
  - Khi bấm dâng hương (`performWalkAndOfferIncense`): Nhân vật đứng dậy đi từ bồ đoàn lên trước bàn thờ Phật, dâng 3 nén tâm hương tỏa khói trầm, nhận +20 công đức, sau đó trở về bồ đoàn. Hành động này được phát sóng thời gian thực cho toàn bộ đạo tràng cùng chiêm bái.

---

## 5. HỆ THỐNG ÂM THANH & ĐỒ HỌA 3D

### 5.1. Web Audio Synthesizer ([js/audio.js](file:///d:/Python/tungkinh/js/audio.js))
- Hoàn toàn tổng hợp âm thanh bằng thuật toán vật lý sóng âm qua Web Audio API (không phụ thuộc file mp3 ngoài có thể bị lỗi 404):
  - **Tiếng Mõ Tịnh Tâm**: Mô phỏng cộng hưởng gỗ tần số trung trầm $420\text{Hz} - 800\text{Hz}$ kèm bộ lọc suy giảm theo thời gian thực.
  - **Đại Hồng Chung**: 7 tầng họa âm kim loại kết hợp điều chế tần số (FM Synthesis), ngân vang sâu lắng $12 - 18$ giây.
  - **Nhạc Thiền Nền**: Tự động lặp vô tận, âm lượng mặc định 30%, có nút bật/tắt và thanh trượt điều chỉnh âm lượng trên Header.
- Tuân thủ chính sách trình duyệt: Tự động resume `AudioContext` ngay trên cử chỉ chạm đầu tiên của người dùng (`pointerdown` / `click`).

### 5.2. Chánh Điện 3D WebGL ([js/temple-3d.js](file:///d:/Python/tungkinh/js/temple-3d.js))
- Chuyển đổi linh hoạt giữa 2.5D Cổ Điển và 3D Toàn Cảnh bằng nút `#btn-toggle-3d`.
- Giới hạn khoảng cách camera: `minDistance: 8`, `maxDistance: 34`.
- Tự động tối ưu khử răng cưa và điều chỉnh theo DPR màn hình (`window.devicePixelRatio`).

---

## 6. DANH MỤC CÁC TỆP TIN NÒNG CỐT CỦA DỰ ÁN

| Đường Dẫn Tệp | Vai Trò & Chức Năng Chính |
|---|---|
| [index.html](file:///d:/Python/tungkinh/index.html) | Điểm vào chính của ứng dụng: Chánh Điện SVG, 14 nút công cụ, 11 modal nghiệp vụ, Orientation Guard và toàn bộ kịch bản điều khiển giao diện. |
| [server.js](file:///d:/Python/tungkinh/server.js) | Máy chủ backend Node.js: Cung cấp API tĩnh, REST API lưu trữ bồ đoàn, WebSocket / SSE Stream và đồng bộ chat. |
| [js/room-chat.js](file:///d:/Python/tungkinh/js/room-chat.js) | Giao diện và logic phòng chat đạo tràng dùng chung thời gian thực. |
| [js/realtime-sanctuary.js](file:///d:/Python/tungkinh/js/realtime-sanctuary.js) | Lớp giao tiếp thời gian thực kết hợp: Node Server, Supabase Realtime và Local Broadcast Mesh. |
| [js/supabase-sanctuary.js](file:///d:/Python/tungkinh/js/supabase-sanctuary.js) | Lớp kết nối lưu trữ đám mây Supabase PostgreSQL và Realtime Channels. |
| [js/daily-quests.js](file:///d:/Python/tungkinh/js/daily-quests.js) | Động cơ nhiệm vụ tu học, việc tốt mỗi ngày và tích lũy công đức hoa sen `🪷`. |
| [js/profile-figurine-3d.js](file:///d:/Python/tungkinh/js/profile-figurine-3d.js) | Mô hình 3D tượng tiểu đồng/hành giả đại diện (Avatar 3D Figurine) trong modal Hồ Sơ Tu Tập. |
| [js/temple-3d.js](file:///d:/Python/tungkinh/js/temple-3d.js) | Động cơ Chánh Điện 3D Three.js: Tôn tượng Phật Thích Ca, lư hương, cột đình, chuông mõ 3D. |
| [js/audio.js](file:///d:/Python/tungkinh/js/audio.js) | Động cơ âm thanh tổng hợp Web Audio API (Mõ, Chuông, Nhạc thiền). |
| [js/canvas-effects.js](file:///d:/Python/tungkinh/js/canvas-effects.js) | Động cơ vật lý Canvas: Khói trầm hương, hoa đăng, bồ câu phóng sanh, bụi vàng kim quang. |
| [data/sanctuary_db.json](file:///d:/Python/tungkinh/data/sanctuary_db.json) | Cơ sở dữ liệu JSON tự động lưu trữ trạng thái bồ đoàn và tin nhắn chat. |

---

## 7. QUY TRÌNH KIỂM THỬ TRƯỚC KHI BÀN GIAO (VERIFICATION RUNBOOK)

Mỗi khi có bất kỳ thay đổi nào trong mã nguồn, Agent bắt buộc phải thực hiện kiểm thử theo các bước sau:

1. **Kiểm tra cú pháp JavaScript & Node.js**:
   ```bash
   node -e "new Function(require('fs').readFileSync('js/room-chat.js', 'utf8')); console.log('OK');"
   node -e "new Function(require('fs').readFileSync('js/realtime-sanctuary.js', 'utf8')); console.log('OK');"
   ```
2. **Kiểm tra máy chủ khởi động thành công**:
   - Chạy thử `node server.js` kiểm tra server lắng nghe cổng 3000 không văng lỗi.
3. **Kiểm thử Responsive Headless Chrome trên 6 độ phân giải tham chiếu**:
   - *Mobile Portrait (390x844)*: `orientation-guard-overlay` hiển thị yêu cầu xoay ngang.
   - *Mobile Landscape (844x390)*: Chánh Điện tràn viền $100\%$, 0 nút bị cắt, bồ đoàn không đè thanh đáy.
   - *Tablet Portrait (768x1024)*: `orientation-guard-overlay` hiển thị yêu cầu xoay ngang.
   - *Tablet Landscape (1024x768)*: Chánh Điện hiển thị trọn vẹn, không có thanh cuộn ngang trang.
   - *Desktop PC (1920x1080 & 1440x900)*: Vào thẳng Chánh Điện, 14 nút hiển thị cân đối $2 \times 7$.

---

## 8. ĐIỀU KIỆN BẤT BIẾN KHI CHỈNH SỬA MÃ NGUỒN (INVARIANT CONSTRAINTS)

1. **Bảo tồn tính năng nghiệp vụ**: Tuyệt đối **không** được xóa, ẩn (`display: none`) các nút chức năng cốt lõi (14 nút công cụ ở đáy, nút chat, nút âm thanh, popup đăng ký) trừ khi cung cấp giao diện truy cập thay thế rõ ràng.
2. **Bảo toàn cơ chế xoay màn hình**:
   - Mobile và Tablet bắt buộc phải xoay ngang khi vào Chánh Điện.
   - Riêng PC thì không cần xoay.
3. **Tuân thủ chuẩn bảo mật trình duyệt**:
   - Các API như `requestFullscreen()` và `AudioContext.resume()` chỉ được gọi khi có cử chỉ tương tác người dùng (`user gesture`). Không gọi tự động gây lỗi NotAllowedError trên console.
4. **Giữ nguyên định dạng liên kết và tài liệu**:
   - Bảo tồn tất cả chú thích hiện có trong mã nguồn.
   - Các liên kết tệp tin trong tài liệu phải sử dụng chuẩn Markdown có thể click được.

---
*Tài liệu này là căn cứ tối cao điều khiển mọi hành vi bảo trì và phát triển tính năng mới cho Chùa An Nhiên.*
