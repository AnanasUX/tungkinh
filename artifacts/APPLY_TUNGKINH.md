# Áp dụng bản nâng cấp cho `AnanasUX/tungkinh`

Patch `tungkinh-antigravity.patch` được tạo trên commit nguồn:

```text
32d01ff1daa53b9cb9c25842bdf5ce81ed95c050
```

## Bàn giao UI/UX chỗ ngồi và NPC

Sau khi áp dụng patch nền, đọc
[`ANTIGRAVITY_UI_UX_NPC_SEATING.md`](./ANTIGRAVITY_UI_UX_NPC_SEATING.md) để triển khai:

- HUD và popup chọn bồ đoàn/ghế;
- xử lý người chơi đi tới, ngồi và đứng dậy;
- đồng bộ trạng thái ghế giữa UI, người chơi và NPC;
- NPC đi xuyên toàn bản đồ, tự tìm ghế, ngồi nghỉ rồi tiếp tục di chuyển; và
- checklist responsive, accessibility và nghiệm thu.

Tài liệu này là đặc tả triển khai bổ sung; các thay đổi đó chưa nằm trong patch nền hiện tại.

## Áp dụng trên Windows

```powershell
cd E:\Python\tungkinh
git status
git apply --check C:\duong-dan-tai-ve\tungkinh-antigravity.patch
git apply C:\duong-dan-tai-ve\tungkinh-antigravity.patch
npm install
npm run build
npm test
node server.js
```

Không chạy `git apply` khi đang có chỉnh sửa trùng các file trong patch. Hãy commit/stash thay đổi của bạn trước.

## Kiểm tra thủ công

1. Xóa key `chua_an_nhien_user_profile`, tải lại và xác nhận Sớ ghi danh xuất hiện.
2. Nhập họ tên, ngày sinh, quê quán; tuổi tự tính.
3. Mobile/tablet dọc: sau ghi danh hiện yêu cầu xoay ngang; desktop không bị chặn.
4. Mobile ngang 844×390: không có cuộn ngang trang, đủ 15 nút dock; Đạo Tràng Chung dùng một cột, sidebar chuyển vào tab Hiện diện.
5. Bấm tên chùa để mở bản đồ đủ 5 khu và thử dịch chuyển.
6. Mở Đạo Tràng Chung, kiểm tra ba tab và gửi tin; bubble trên nhân vật tự mất sau 5 giây.
7. Kiểm tra camera/mic và đóng call; trình duyệt không còn track media chạy nền.
8. Kiểm tra cúi đầu khi tới trước chùa, mở kinh lúc ngồi, dâng hương, lễ Phật, thỉnh chuông.

## Source-of-truth

Đọc `AGENTS.md` và `SYSTEM_CONFIG.md` sau khi áp dụng. Không chỉnh trực tiếp:

- `dist/app.bundle.js`
- `js/app.bundle.js`
- `css/modern-ui.css`

Ba file trên được tạo lại bởi `npm run build`.
