# ConvoX ChatBot

ConvoX là một Facebook Chat Bot được phát triển bởi ConvoX Team với nhiều tính năng tiên tiến.

## Yêu cầu hệ thống

• NodeJS v16.x trở lên
• Facebook Account để lấy fbstate
• Internet kết nối ổn định

## Cài đặt

### 1. Clone project
```bash
git clone https://github.com/NTV-gnouv/ConvoX
cd ConvoX
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình Facebook FbState
- File `fbstate.json` đã được tạo sẵn với dữ liệu mẫu
- **Lưu ý**: Cần thay thế bằng fbstate của bạn

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

### 5. Chạy bot
```bash
npm start
```

## Tính năng

• Hệ thống menu thống kê với categories
• Plugin architecture mở rộng
• Hỗ trợ nhiều ngôn ngữ
• Tích hợp fca-unofficial
• Hệ thống phân quyền admin/moderator
• Quản lý nhóm chat (whitelist/blacklist)
• Logging system tối ưu

## Cấu trúc thư mục

```
ConvoX/
├── config/          # Cấu hình bot
│   ├── bot.json     # Cấu hình chính
│   ├── commands.json # Định nghĩa commands
│   ├── plugins.json # Cấu hình plugins
│   └── permissions.json # Phân quyền
├── core/            # Core system
│   ├── BotManager.js
│   ├── CommandHandler.js
│   ├── PluginManager.js
│   ├── AuthManager.js
│   ├── Logger.js
│   └── MenuSystem.js
├── plugins/         # Plugin system
│   ├── admin/
│   ├── help/
│   ├── info/
│   ├── menu/
│   ├── ping/
│   └── systemadmin/
├── fbstate.json    # Facebook state
├── package.json     # Dependencies
└── index.js         # Main entry point
```

## Sử dụng

### Lệnh cơ bản
- `!menu` - Hiển thị menu chính
- `!help` - Hướng dẫn sử dụng
- `!info` - Thông tin bot
- `!ping` - Kiểm tra ping

### Lệnh Admin (chỉ Owner)
- `!admin grant <userID>` - Cấp quyền Moderator
- `!admin revoke <userID>` - Thu hồi quyền Moderator
- `!group allow <threadID>` - Cho phép nhóm sử dụng bot
- `!group block <threadID>` - Chặn nhóm
- `!restart` - Khởi động lại bot

### Menu system
1. Gõ `!menu` để xem các category
2. Chọn số thứ tự category (VD: 1, 2, 3...)
3. Bot sẽ hiển thị danh sách lệnh trong category đó

## Plugin Development

### Cấu trúc plugin
```
plugins/
├── plugin-name/
│   ├── index.js          # Plugin chính
│   ├── config.json       # Cấu hình plugin (optional)
│   └── README.md         # Hướng dẫn plugin (optional)
```

### Ví dụ plugin
```javascript
class MyPlugin {
    constructor(api, config, authManager, logger) {
        this.api = api;
        this.config = config;
        this.authManager = authManager;
        this.logger = logger;
    }

    async initialize() {
        console.log('Plugin initialized');
    }

    registerCommands(commandHandler) {
        commandHandler.registerCommand('hello', this.handleHello.bind(this), {
            description: 'Chào hỏi',
            usage: '!hello',
            category: 'general'
        });
    }

    async handleHello(event) {
        await this.api.sendMessage('Xin chào!', event.threadID);
    }
}

module.exports = MyPlugin;
```

## Hệ thống phân quyền

### 4 Cấp độ quyền:
1. **👤 User (0)** - Người dùng thường
2. **👮 Moderator (1)** - Quản lý cơ bản
3. **🔧 Admin (2)** - Quản trị hệ thống  
4. **👑 Owner (3)** - Chủ sở hữu bot

### Cấu hình phân quyền
Tạo file `.env`:
```env
ADMIN_UIDS=1000123456789 1000234567891
BOT_PREFIX=!
BOT_NAME=ConvoX
BOT_VERSION=1.0.0
```

## Quản lý nhóm chat

### Chế độ Whitelist (mặc định)
- Bot **CHỈ** hoạt động trong các nhóm được phép
- Phù hợp khi bạn muốn kiểm soát chặt chẽ

### Chế độ Blacklist  
- Bot hoạt động trong **TẤT CẢ** nhóm
- Chỉ những nhóm bị chặn mới không thể sử dụng bot
- Phù hợp khi bạn muốn cho phép rộng rãi nhưng chặn một số nhóm cụ thể

## Logging System

### Mức độ Logging
- **debug**: Thông tin chi tiết cho việc debug
- **info**: Thông tin chung (mặc định)
- **warn**: Cảnh báo
- **error**: Lỗi
- **silent**: Tắt hoàn toàn

### Cấu hình logging
```json
{
  "logging": {
    "level": "info",
    "enableColors": true,
    "enableFileLogging": false
  }
}
```

## Troubleshooting

### Lỗi kết nối Facebook
1. Kiểm tra fbstate.json có đúng không
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

## Đóng góp

1. Fork repository này
2. Tạo branch mới cho feature của bạn (`git checkout -b feature/AmazingFeature`)
3. Commit các thay đổi (`git commit -m 'Add some AmazingFeature'`)
4. Push lên branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

### Quy tắc đóng góp
- Tuân thủ coding style hiện tại
- Thêm comments cho code phức tạp
- Test kỹ trước khi submit
- Cập nhật documentation nếu cần

## Giấy phép

Dự án này được cấp phép theo MIT License. Xem file `LICENSE` để biết thêm chi tiết.

## Tác giả

• **Thanh Vương**: Lead Developer & Creator
• **ConvoX Team**: Facebook Chat Bot Development Team

## Dự án

• **ConvoX chatbot thế hệ mới**: Facebook Messenger Bot với kiến trúc hiện đại

---

**Chúc bạn sử dụng ConvoX Bot vui vẻ! 🎉**
