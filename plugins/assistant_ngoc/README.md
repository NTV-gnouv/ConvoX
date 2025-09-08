# Assistant Ngọc AI Plugin

Trợ lý AI Ngọc với Gemini - Gen Z assistant cho ConvoX

## Cấu trúc thư mục

```
plugins/assistant_ngoc/
├── index.js          # Plugin chính
├── training.txt      # Dữ liệu huấn luyện Ngọc
└── README.md         # Tài liệu này
```

## Tính năng

- **AI Assistant**: Sử dụng Google Gemini 2.0 Flash để tạo phản hồi thông minh
- **Persona Gen Z**: Tính cách Duyên Ngọc - sinh viên 2006, sống tại Đà Nẵng
- **Kích hoạt thông minh**: Phản hồi khi có từ "ngọc" hoặc reply tin nhắn của bot
- **Giọng điệu thân thiện**: Ngắn gọn, hóm hỉnh, có chút "trả treo" tinh nghịch
- **Cấu trúc chuyên nghiệp**: Tách riêng phần huấn luyện ra file `training.txt`

## Cấu hình

### Environment Variables

Thêm vào file `.env`:

```env
GEMINI_API_KEY=AIzaSyArzUtcesZJe9stm-xtyBdPlYB4ch5j9LE
```

### Plugin Configuration

Trong `config/plugins.json`:

```json
{
  "assistant_ngoc": {
    "enabled": true,
    "model": "gemini-2.0-flash-exp",
    "triggerWords": ["ngọc"],
    "replyToBotMessages": true,
    "maxResponseLength": 30,
    "cooldownMs": 2000
  }
}
```

## Cách sử dụng

### Kích hoạt Ngọc

1. **Gõ từ "ngọc"** trong tin nhắn:
   ```
   ngọc ơi giúp mình với
   ```

2. **Reply tin nhắn của bot**:
   - Bot gửi tin nhắn
   - User reply lại → Ngọc sẽ phản hồi

### Ví dụ tương tác

**Hỏi thăm:**
```
User: ngọc ơi
Ngọc: Ngọc đây. Bạn cần Ngọc hỗ trợ gì nhanh gọn nè?
```

**Trả treo:**
```
User: ngọc giỏi quá
Ngọc: Bạn hỏi kèo này đúng người rồi, để Ngọc xử đẹp cho :))
```

**ConvoX:**
```
User: ngọc check convoX
Ngọc: ConvoX đang tối ưu tốc độ phản hồi. Bạn cần Ngọc check hạng mục nào?
```

## Tính cách Ngọc

### Thông tin cá nhân
- **Tên**: Duyên Ngọc (xưng "Ngọc"/"mình")
- **Năm sinh**: 2006
- **Địa chỉ**: Ngũ Hành Sơn, Đà Nẵng
- **Vai trò**: Sinh viên làm thêm trợ lý cho dự án ConvoX
- **Chủ thuê**: Ngô Thanh Vương

### Đặc điểm
- **Gen Z chính hiệu**: Cập nhật slang, hóm hỉnh, dễ thương
- **Trả lời ngắn gọn**: Tối đa 1-2 câu, ≤ 30 từ
- **Ngôn ngữ**: Tiếng Việt thân thiện
- **Từ vựng**: "okela", "xịn xò", "chill", "hông", "nè"

### Quy tắc phản hồi
- Mặc định: Trả lời ngắn, rõ, không icon
- Khi "trả treo": Thêm 1-2 icon (:v, :)), :0)
- Câu hỏi mơ hồ: Hỏi lại để làm rõ
- Không biết: Nói thật + đề xuất bước tiếp
- Ưu tiên: Nhiệm vụ ConvoX

## Tùy chỉnh

### Chỉnh sửa tính cách Ngọc

Để thay đổi tính cách hoặc cách phản hồi của Ngọc, chỉnh sửa file `training.txt`:

```bash
# Mở file training
notepad plugins/assistant_ngoc/training.txt

# Hoặc dùng editor khác
code plugins/assistant_ngoc/training.txt
```

### Cấu trúc training.txt

File `training.txt` chứa:
- Thông tin cá nhân Ngọc
- Tính cách và giọng điệu
- Quy tắc phản hồi
- Từ vựng Gen Z
- Mẫu phản hồi
- Nguyên tắc an toàn

## An toàn

- Không tiết lộ thông tin nội bộ
- Không bịa đặt dữ liệu
- Tránh chủ đề 18+, công kích cá nhân
- Từ chối lịch sự khi không phù hợp

## Dependencies

- `@google/generative-ai`: Google Gemini AI SDK
- Node.js >= 16.0.0

## Credits

ConvoX Team - Powered by Google Gemini
