# 🌐 Translate Plugin (trans)

Dịch đa ngôn ngữ dùng Google Translate công khai cho ConvoX.

## ✨ Tính năng
- Tự phát hiện ngôn ngữ khi bạn reply tin nhắn cần dịch
- Chỉ định rõ nguồn → đích để tránh nhầm lẫn
- Có thể dịch trực tiếp văn bản mà không cần reply
- Đầu ra tối giản: chỉ gửi câu đã dịch

## 📦 Cài đặt
Plugin đã được thêm sẵn vào mã nguồn. Đảm bảo `config/plugins.json` có:

```json
{
  "plugins": {
    "defaultPlugins": [
      "trans"
    ],
    "pluginConfig": {
      "trans": {
        "enabled": true,
        "defaultTarget": "vi"
      }
    }
  }
}
```

## 🚀 Cách dùng
- Dịch khi reply (đích = tiếng Việt):
  - Trả lời tin nhắn: `!trans vi` hoặc `!trans vietnam`
- Chỉ định nguồn → đích rõ ràng:
  - `!trans ukraina -> vietnam`
- Dịch trực tiếp văn bản (không reply):
  - `!trans en Xin chào mọi người`

Kết quả: bot chỉ gửi lại câu đã dịch, reply vào tin nhắn gốc nếu có.

## 🛠️ Tùy chỉnh
- `defaultTarget` (mặc định `vi`): ngôn ngữ đích khi bạn không chỉ định.
- Hỗ trợ tên/mã ngôn ngữ phổ biến: `vi`, `en`, `uk`, `ja`, `ko`, `zh-CN`, `zh-TW`, `fr`, `de`, `es`, `ru`, `id`, `ms`, `tl`, `it`, `tr`, `ar`, `pl`, `nl`, ... và các biến thể như "vietnam", "ukraina", "trung", "nhat", ...

## 🔍 Gợi ý
- Nếu dịch sai do nhầm ngôn ngữ, hãy dùng cú pháp `nguồn -> đích` để chính xác hơn.
- API dùng `translate.googleapis.com` (không cần API key). Hạn chế có thể thay đổi theo Google.

## 📄 File
- `plugins/trans/index.js` — Mã nguồn plugin
- `plugins/trans/README.md` — Tài liệu này

## 🧩 Phát triển plugin
Xem phần "Plugin Development" trong README chính để biết chuẩn cấu trúc, vòng đời và best practices.
