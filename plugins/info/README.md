# Info Plugin

Hiển thị thông tin theo cấp bậc và tra cứu người dùng/nhóm.

## Lệnh
- !info
  - User: tên bạn, tên box, quyền hiện tại, danh sách admin/mod của box
  - Moderator: danh sách Admin/Owner (kèm cấp bậc) + BOT_NAME
  - Admin/Owner: danh sách Owner + BOT_VERSION + BOT_DESCRIPTION
- !info @user (trong box)
  - Chỉ sử dụng bởi: Moderator, Admin, Owner
  - Hiển thị: tên, ngày tham gia, người thêm vào (nếu có; có thể hiển thị "Không rõ")
- !info <ID>
  - Chỉ sử dụng bởi: Moderator, Admin, Owner
  - Nếu là threadID có bot tham gia: tên nhóm, chủ/admins
  - Nếu là userID: tên và ID người dùng

## Ghi chú
- Một số thông tin (ngày tham gia, người thêm) không phải lúc nào API cũng cung cấp, nên có thể hiện "Không rõ".
- Tôn trọng cooldown chung COMMAND_COOLDOWN.
- Dựa vào phân quyền từ AuthManager.
