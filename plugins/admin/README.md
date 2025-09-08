# Admin Plugin – Hướng dẫn sử dụng

Plugin này cung cấp các lệnh quản trị để quản lý phân quyền, phê duyệt người dùng/nhóm (box), và cấu hình chế độ truy cập cho bot.

## Tổng quan vai trò (role)

- 0 – 👤 User: dùng lệnh cơ bản; chỉ hoạt động trong box đã được phê duyệt (whitelist) hoặc không bị chặn (blacklist)
- 1 – 👮 Moderator: hoạt động ở mọi nơi; do Owner cấp
- 2 – 🔧 Admin: quản lý bot; hoạt động ở mọi nơi; được phép phê duyệt user/box
- 3 – 👑 Owner: toàn quyền; cấu hình cấp cao và cấp quyền Moderator

## Cấu hình nhanh

- Biến môi trường (file `.env`):
  - `OWNER_UIDS=uid1,uid2` (bắt buộc để xác định Owner)
  - `ADMIN_UIDS=uid3,uid4`
- Dữ liệu phân quyền lưu trong `config/permissions.json` (tự tạo/ghi khi chạy lệnh).

## Chế độ phê duyệt box (nhóm)

- Chế độ mặc định: `whitelist` – chỉ các box trong danh sách cho phép mới dùng được bot (User)
- `blacklist` – tất cả box dùng được bot, trừ các box bị chặn
- Mod/Admin/Owner luôn dùng được bot ở mọi nơi, không phụ thuộc chế độ.

## Lệnh quản trị chính

### 1) Phân quyền

- `!admin grant <userID>` – Owner cấp quyền Moderator cho user
- `!admin revoke <userID>` – Owner thu hồi quyền Moderator
- `!admin list` – Liệt kê Owners, Admins, Moderators, Users được phê duyệt
- `!admin whoami` hoặc `!whoami` – Xem quyền của bạn
- `!reloadperms` – Tải lại phân quyền từ file và biến môi trường
- `!adminstats` – Thống kê nhanh phân quyền

Ví dụ:
- `!admin grant 1000123456789`
- `!admin list`

### 2) Quản lý nhóm (box) – Admin trở lên

- `!group allow [threadID]` – Phê duyệt box (bỏ threadID để dùng box hiện tại)
- `!group disallow [threadID]` – Gỡ phê duyệt box
- `!group block [threadID]` – Chặn box (dùng cho blacklist)
- `!group unblock [threadID]` – Bỏ chặn box
- `!group list` – Danh sách box được phép/bị chặn và chế độ hiện tại
- `!group mode <whitelist|blacklist>` – Đổi chế độ quản lý box
- `!group clear` – Xóa toàn bộ cấu hình box
- `!groupinfo` – Xem trạng thái box hiện tại
 - `!grouprun` – Danh sách box đã duyệt (dạng: `STT|ID|Tên|chủ box`)
 - `!groupwait` – Danh sách box đang chờ phê duyệt (dạng: `STT|ID|Tên|chủ box`)

Ví dụ:
- `!group allow` (phê duyệt box hiện tại)
- `!group mode whitelist`

### 3) Phê duyệt người dùng (Admin trở lên)

- `!user allow <userID>` – Phê duyệt user dùng bot ở mọi nơi (không cần box phê duyệt)
- `!user disallow <userID>` – Gỡ phê duyệt
- `!user list` – Danh sách user đã được phê duyệt

Ví dụ:
- `!user allow 1000123456789`

## Tự động thông báo khi bot được thêm vào box

Khi bot được thêm vào một box mới (hoặc tạo box mới có sẵn bot), bot sẽ gửi tin nhắn riêng đến Admin/Owner với thông tin ThreadID, tên box (nếu có) và gợi ý dùng `!group allow <threadID>` để phê duyệt nhanh.

## Lưu trữ dữ liệu

File `config/permissions.json` chứa:

- `moderators`: danh sách UID Moderator
- `allowedUsers`: danh sách UID user được phê duyệt dùng ở mọi nơi
- `allowedGroups`: danh sách ThreadID box được duyệt (cho whitelist)
- `blockedGroups`: danh sách ThreadID box bị chặn (cho blacklist)
- `groupMode`: `whitelist` hoặc `blacklist`
- `lastUpdated`: timestamp lần cập nhật gần nhất

File này sẽ được cập nhật tự động khi dùng các lệnh quản trị.

## Ghi chú & mẹo

- Hãy thiết lập `OWNER_UIDS` ngay từ đầu để bảo đảm kiểm soát hệ thống.
- Trong chế độ whitelist, sau khi bot vào box, Admin/Owner cần `!group allow` để User có thể dùng bot.
- `threadID` có thể lấy bằng `!groupinfo` (chạy trong box cần kiểm tra).
- Nếu không chắc, dùng `!admin list` và `!user list` để kiểm tra nhanh trạng thái phân quyền.
- Trong menu, các lệnh thuộc mục Admin chỉ hiển thị với Admin trở lên; User và Moderator sẽ không thấy các lệnh Admin.

---
Nếu bạn cần bổ sung workflow phê duyệt nhanh qua phản hồi (reply vào thông báo), hãy tạo issue hoặc mở PR trong repo.