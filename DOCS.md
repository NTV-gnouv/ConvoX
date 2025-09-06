# ConvoX Bot Documentation

## Tổng quan

ConvoX chatbot thế hệ mới là một Facebook Messenger Bot được xây dựng với kiến trúc modular, sử dụng thư viện fca-unofficial.

**Tác giả:** Thanh Vương  
**Dự án:** ConvoX chatbot thế hệ mới

## Cấu trúc hệ thống

### Core System
- **Bot Manager**: Quản lý kết nối Facebook và xử lý tin nhắn
- **Command Handler**: Xử lý và phân tích lệnh từ người dùng
- **Plugin Manager**: Quản lý và tải các plugin
- **Menu System**: Hệ thống menu với categories

### Plugin Architecture
- Plugins được tổ chức theo categories
- Mỗi plugin có thể có nhiều commands
- Hỗ trợ hot-reload plugins

### Menu System
- Categories được định nghĩa trong config
- Người dùng có thể chọn category bằng cách reply tin nhắn
- Hiển thị danh sách commands trong category được chọn

## Cấu hình

### fbstate.json
Chứa Facebook authentication state để đăng nhập vào Facebook.

### config/
- `bot.json`: Cấu hình chung của bot
- `commands.json`: Định nghĩa commands và categories
- `plugins.json`: Cấu hình plugins

## API Reference

### Bot Manager
```javascript
const bot = new BotManager(appstate);
bot.start();
```

### Command Handler
```javascript
const handler = new CommandHandler();
handler.registerCommand(command, handler);
```

### Plugin Manager
```javascript
const pluginManager = new PluginManager();
pluginManager.loadPlugin(pluginPath);
```

## Development

### Thêm Plugin mới
1. Tạo thư mục plugin trong `plugins/`
2. Implement plugin interface
3. Đăng ký plugin trong `plugins.json`

### Thêm Command mới
1. Tạo command handler
2. Đăng ký command trong `commands.json`
3. Test command

## Troubleshooting

### Lỗi kết nối Facebook
- Kiểm tra fbstate.json
- Đảm bảo Facebook account không bị khóa
- Kiểm tra network connection

### Plugin không load
- Kiểm tra syntax của plugin
- Xem logs để debug
- Đảm bảo plugin implement đúng interface
