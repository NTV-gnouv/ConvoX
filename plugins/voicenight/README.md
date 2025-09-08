# VoiceNight Plugin

Gửi voice chúc ngủ ngon theo lịch trong khung 19:00 → 04:00.

## Lệnh
- `!nn <giờ>`: đặt lịch gửi mỗi ngày. Hỗ trợ: `22`, `22h`, `22:30`, `22h30`.
- `!nn off`: tắt gửi tự động cho box hiện tại.

Yêu cầu:
- Quyền: Moderator trở lên (theo box).
- Box phải được duyệt (whitelist).
- Khung giờ hợp lệ: 19:00 đến 04:00 (sáng hôm sau). Nếu ngoài khung, bot sẽ báo: "Không ai ngủ giờ trên cả".

Hành vi:
- Sau khi set giờ, bot gửi 1 voice ngay lập tức để đánh dấu cài đặt thành công.
- Đến đúng giờ mỗi ngày, bot tự động gửi ngẫu nhiên 1 trong 6 file voice trong `plugins/voicenight/voice/` (`nn1.m4a`..`nn6.m4a`).

## Cấu hình
- Plugin được bật sẵn trong `config/plugins.json`.
- Dữ liệu mỗi box lưu tại `plugins/voicenight/nn_state.json`.

## Ghi chú
- Nếu xóa/di chuyển các file `nn*.m4a`, hãy đảm bảo còn ít nhất một file hợp lệ.
- Bot chỉ gửi trong nhóm đã duyệt.

— ConvoX
