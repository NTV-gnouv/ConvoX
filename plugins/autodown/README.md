# AutoDown Plugin

Plugin tự động tải video/ảnh từ các nền tảng mạng xã hội khi phát hiện link trong tin nhắn.

## Tính năng

- **Tự động phát hiện link**: Không cần lệnh, chỉ cần gửi link là bot sẽ tự động tải
- **Hỗ trợ nhiều nền tảng**:
  - **Facebook**: Video posts (ảnh posts sẽ hiển thị ❌)
  - **TikTok**: Video + slideshow ảnh
  - **Instagram**: Video posts (ảnh posts sẽ hiển thị ❌)
  - **YouTube**: Video
  - **Douyin**: Video
- **Thông báo trạng thái**: Sử dụng emoji reactions để thông báo tiến trình
  - ⌛ Đang xử lý
  - ✅ Hoàn thành
  - ❌ Không phải video (chỉ cho IG/FB)

## Cách sử dụng

1. **Gửi link**: Chỉ cần gửi link của video/ảnh vào chat
2. **Bot tự động xử lý**: Bot sẽ tự động tải và gửi lại media
3. **Không cần prefix**: Không cần dùng `!` hay lệnh gì cả

## Ví dụ

### Video thành công
```
Người dùng: https://www.tiktok.com/@user/video/1234567890
Bot: [TIKTOK] - Tự Động Tải
     👤 Tác giả: @user
     💬 Tiêu đề: Video title
     [Gửi kèm video/ảnh]
Reaction: ⌛ → ✅
```

### Post ảnh (IG/FB)
```
Người dùng: https://www.instagram.com/p/ABC123/
Reaction: ⌛ → ❌ (Không phải video)
```

## Cấu hình

Plugin được cấu hình trong `config/plugins.json`:

```json
{
  "autodown": {
    "enabled": true,
    "autoEnable": true,
    "supportedPlatforms": [
      "facebook.com",
      "tiktok.com",
      "vt.tiktok.com",
      "v.douyin.com",
  "instagram.com",
      "youtube.com",
      "youtu.be"
    ]
  }
}
```

## Yêu cầu hệ thống

- Node.js >= 16.0.0
- Dependencies: `node-fetch`, `mkdirp`, `yt-dlp-exec`

## Credit

© Thanh Vương — ConvoX v1.0.0

## Cải tiến mới

- **Xử lý thông minh**: IG/Threads/FB chỉ tải video, post ảnh sẽ hiển thị ❌
- **Phát hiện video chính xác**: Sử dụng metadata probe để kiểm tra trước khi tải
- **Thông báo trạng thái**: Emoji reactions giúp người dùng biết tiến trình
- **Tối ưu hiệu suất**: Tự động đảm bảo yt-dlp binary có sẵn trước khi xử lý

## Lưu ý

- Plugin tự động bật cho tất cả thread
- Cache được lưu trong thư mục `plugins/autodown/cache`
- Tự động cleanup file tạm sau khi gửi
- IG/FB: Chỉ hỗ trợ video posts, ảnh posts sẽ bị từ chối
- TikTok: Hỗ trợ cả video và slideshow ảnh
