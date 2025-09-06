# ConvoX Bot - Hệ thống Phân quyền Admin

## Tổng quan

ConvoX Bot đã được nâng cấp với hệ thống phân quyền mạnh mẽ, cho phép quản lý quyền truy cập các lệnh một cách linh hoạt và bảo mật.

## Cấu trúc Phân quyền

### 4 Cấp độ quyền:

1. **👤 User (0)** - Người dùng thường
2. **👮 Moderator (1)** - Quản lý cơ bản
3. **🔧 Admin (2)** - Quản trị hệ thống  
4. **👑 Owner (3)** - Chủ sở hữu bot

## Cấu hình

### 1. File .env

Tạo file `.env` trong thư mục gốc với nội dung:

```env
# Danh sách UID admin/owner (cách nhau bởi dấu phẩy hoặc khoảng trắng)
ADMIN_UIDS=1000123456789 1000234567891

# Cấu hình bot
BOT_PREFIX=!
BOT_NAME=ConvoX
BOT_VERSION=1.0.0
```

### 2. File permissions.json

File `config/permissions.json` lưu trữ danh sách moderator:

```json
{
  "moderators": ["1000123456789", "1000234567891"],
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

## Lệnh Admin

### Lệnh quản lý quyền (chỉ Owner):

- `!admin grant <userID>` - Cấp quyền Moderator
- `!admin revoke <userID>` - Thu hồi quyền Moderator  
- `!admin list` - Xem danh sách phân quyền
- `!admin whoami` - Kiểm tra quyền của bạn
- `!reloadperms` - Tải lại cấu hình phân quyền
- `!adminstats` - Xem thống kê phân quyền

### Lệnh hệ thống:

- `!restart` - Khởi động lại bot (Owner)
- `!shutdown` - Tắt bot (Owner)
- `!reload` - Tải lại cấu hình (Admin+)

### Lệnh moderation:

- `!ban <userID> [reason]` - Cấm người dùng (Moderator+)
- `!unban <userID>` - Bỏ cấm người dùng (Moderator+)
- `!kick <userID> [reason]` - Đuổi khỏi nhóm (Moderator+)

### Lệnh thông tin:

- `!whoami` - Kiểm tra quyền của bản thân

## Cách sử dụng trong Plugin

### Đăng ký lệnh với phân quyền:

```javascript
commandHandler.registerCommand('mycommand', this.handleCommand.bind(this), {
    description: 'Mô tả lệnh',
    usage: '!mycommand',
    example: '!mycommand',
    category: 'general',
    minRole: 1, // Yêu cầu Moderator trở lên
    adminOnly: false, // Hoặc true để yêu cầu Admin+
    cooldown: 5,
    aliases: ['alias1', 'alias2']
});
```

### Kiểm tra quyền trong code:

```javascript
// Kiểm tra quyền cụ thể
if (this.authManager.hasPermission(userID, 2)) {
    // Code cho Admin trở lên
}

// Kiểm tra quyền cụ thể
if (this.authManager.isOwner(userID)) {
    // Code chỉ dành cho Owner
}

if (this.authManager.isAdmin(userID)) {
    // Code cho Admin/Owner
}

if (this.authManager.isModerator(userID)) {
    // Code cho Moderator trở lên
}
```

## Bảo mật

### File được bảo vệ:

- `.env` - Chứa UID admin, không commit vào Git
- `config/permissions.json` - Chứa danh sách moderator, không commit vào Git
- `fbstate.json` - Chứa session Facebook, không commit vào Git

### Lưu ý quan trọng:

1. **Không bao giờ commit file `.env`** vào Git
2. **Không bao giờ commit file `config/permissions.json`** vào Git  
3. **Không bao giờ commit file `fbstate.json`** vào Git
4. Thay đổi UID mẫu trong `.env` thành UID thực của bạn
5. Chỉ Owner mới có thể cấp/thu hồi quyền moderator

## Troubleshooting

### Bot không nhận diện quyền admin:

1. Kiểm tra file `.env` có tồn tại và có UID đúng
2. Kiểm tra UID trong `.env` có đúng định dạng số
3. Restart bot sau khi thay đổi `.env`

### Lệnh admin không hoạt động:

1. Kiểm tra quyền bằng `!whoami`
2. Đảm bảo UID của bạn có trong `ADMIN_UIDS`
3. Kiểm tra log console để xem lỗi

### Plugin không load được:

1. Kiểm tra plugin có trong `defaultPlugins` của `plugins.json`
2. Kiểm tra constructor plugin có nhận đúng 3 tham số: `(api, config, authManager)`
3. Kiểm tra plugin có method `registerCommands(commandHandler)`

## Ví dụ Plugin với Phân quyền

```javascript
class MyPlugin {
    constructor(api, config, authManager) {
        this.api = api;
        this.config = config;
        this.authManager = authManager;
    }

    async initialize() {
        console.log('My Plugin initialized');
    }

    registerCommands(commandHandler) {
        // Lệnh cho User
        commandHandler.registerCommand('hello', this.handleHello.bind(this), {
            description: 'Chào hỏi',
            usage: '!hello',
            category: 'general'
        });

        // Lệnh cho Moderator+
        commandHandler.registerCommand('modonly', this.handleModOnly.bind(this), {
            description: 'Lệnh chỉ moderator',
            usage: '!modonly',
            category: 'moderation',
            minRole: 1
        });

        // Lệnh cho Admin+
        commandHandler.registerCommand('adminonly', this.handleAdminOnly.bind(this), {
            description: 'Lệnh chỉ admin',
            usage: '!adminonly',
            category: 'admin',
            minRole: 2
        });
    }

    async handleHello(event) {
        // Mọi người đều có thể dùng
        await this.api.sendMessage('Xin chào!', event.threadID);
    }

    async handleModOnly(event) {
        // Chỉ moderator trở lên
        await this.api.sendMessage('Bạn là moderator!', event.threadID);
    }

    async handleAdminOnly(event) {
        // Chỉ admin trở lên
        await this.api.sendMessage('Bạn là admin!', event.threadID);
    }
}

module.exports = MyPlugin;
```

## Hỗ trợ

Nếu gặp vấn đề với hệ thống phân quyền, vui lòng:

1. Kiểm tra log console để xem lỗi
2. Đảm bảo cấu hình đúng theo hướng dẫn
3. Restart bot sau khi thay đổi cấu hình
4. Liên hệ developer để được hỗ trợ
