# 🚀 HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY CONVOX BOT

**Tác giả:** Thanh Vương  
**Dự án:** ConvoX chatbot thế hệ mới

## 📋 Yêu cầu hệ thống

- **Node.js**: v16.x trở lên
- **npm**: v7.x trở lên
- **Facebook Account**: Để lấy appstate
- **Internet**: Kết nối ổn định

## 🔧 Cài đặt

### 1. Clone project
```bash
git clone https://github.com/ConvoXTeam/ConvoXBot.git
cd ConvoXBot
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình Facebook AppState

#### Cách 1: Sử dụng appstate có sẵn
- File `appstate.json` đã được tạo sẵn với dữ liệu mẫu
- **Lưu ý**: Cần thay thế bằng appstate của bạn

#### Cách 2: Tạo appstate mới
```bash
# Sử dụng c3c-fbstate hoặc công cụ tương tự
npx c3c-fbstate
# Sau đó copy kết quả vào file appstate.json
```

### 4. Cấu hình bot
Chỉnh sửa file `config/bot.json`:
```json
{
  "bot": {
    "name": "ConvoX Bot",
    "prefix": "!",
    "admin": ["YOUR_FACEBOOK_ID"]
  }
}
```

## 🎯 Chạy bot

### Chạy bình thường
```bash
npm start
```

### Chạy với nodemon (development)
```bash
npm run dev
```

### Chạy với PM2 (production)
```bash
npm install -g pm2
pm2 start index.js --name "convox-bot"
pm2 startup
pm2 save
```

## 📱 Sử dụng bot

### Lệnh cơ bản
- `!menu` - Hiển thị menu chính
- `!help` - Hướng dẫn sử dụng
- `!info` - Thông tin bot
- `!ping` - Kiểm tra ping

### Menu system
1. Gõ `!menu` để xem các category
2. Chọn số thứ tự category (VD: 1, 2, 3...)
3. Bot sẽ hiển thị danh sách lệnh trong category đó

### Categories có sẵn
1. 🎮 Game & Entertainment
2. 🔧 Utility & Tools  
3. 📊 Information & Stats
4. 🎨 Media & Images
5. ⚙️ Admin & Settings

## 🔌 Plugin System

### Cấu trúc plugin
```
plugins/
├── plugin-name/
│   ├── index.js          # Plugin chính
│   ├── config.json       # Cấu hình plugin (optional)
│   └── README.md         # Hướng dẫn plugin (optional)
```

### Tạo plugin mới
1. Tạo thư mục plugin trong `plugins/`
2. Tạo file `index.js` với class plugin
3. Đăng ký plugin trong `config/plugins.json`

### Ví dụ plugin
```javascript
class MyPlugin {
    constructor(api, config) {
        this.api = api;
        this.config = config;
    }

    async initialize() {
        console.log('Plugin initialized');
    }

    async cleanup() {
        console.log('Plugin cleaned up');
    }
}

module.exports = MyPlugin;
```

## ⚙️ Cấu hình nâng cao

### Environment Variables
Copy file `env.example` thành `.env` và chỉnh sửa:
```bash
cp env.example .env
```

### Logging
- Logs được lưu trong thư mục `logs/`
- Có thể cấu hình log level trong `config/bot.json`

### Hot Reload
- Plugin hot reload được bật mặc định
- Tự động reload plugin khi có thay đổi

## 🛠️ Scripts hữu ích

### Update bot
```bash
node update.js
```

### Cleanup files
```bash
node cleanup.js
```

### Check logs
```bash
tail -f logs/bot.log
```

## 🐛 Troubleshooting

### Lỗi kết nối Facebook
1. Kiểm tra appstate.json có đúng không
2. Đảm bảo Facebook account không bị khóa
3. Thử tạo appstate mới

### Plugin không load
1. Kiểm tra syntax của plugin
2. Xem logs để debug
3. Đảm bảo plugin implement đúng interface

### Bot không phản hồi
1. Kiểm tra prefix trong config
2. Đảm bảo bot có quyền gửi tin nhắn
3. Kiểm tra network connection

## 📞 Hỗ trợ

- **GitHub Issues**: Báo cáo lỗi và đề xuất tính năng
- **Documentation**: Xem `DOCS.md` để biết thêm chi tiết
- **Community**: Tham gia Discord server của ConvoX Team

## 📄 License

Dự án này được cấp phép theo MIT License. Xem file `LICENSE` để biết thêm chi tiết.

---

**Chúc bạn sử dụng ConvoX Bot vui vẻ! 🎉**
