<div align="center">

# 🤖 ConvoX ChatBot

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/NTV-gnouv/ConvoX)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D16.0.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Facebook](https://img.shields.io/badge/facebook-messenger-1877F2.svg)](https://facebook.com/)

**ConvoX là một Facebook Chat Bot thế hệ mới với kiến trúc hiện đại và nhiều tính năng tiên tiến**

*Được phát triển bởi ConvoX Team với tình yêu và đam mê*

[🚀 Bắt đầu](#-cài-đặt) • [📖 Tài liệu](#-tính-năng) • [🔧 Plugin](#-plugin-development) • [❓ Hỗ trợ](#-troubleshooting)

</div>

---

## ✨ Tính năng nổi bật

<table>
<tr>
<td width="50%">

### 🎯 **Core Features**
- ✅ **Plugin Architecture** - Hệ thống plugin mở rộng
- ✅ **Menu System** - Menu thống kê với categories
- ✅ **Permission System** - 4 cấp độ phân quyền
- ✅ **Command Handler** - Xử lý lệnh thông minh
- ✅ **Logging System** - Hệ thống log tối ưu
- ✅ **Error Handling** - Xử lý lỗi toàn diện

</td>
<td width="50%">

### 🔧 **Advanced Features**
- ✅ **Group Management** - Quản lý nhóm chat
- ✅ **Cooldown System** - Chống spam lệnh
- ✅ **Multi-language** - Hỗ trợ đa ngôn ngữ
- ✅ **Database Support** - SQLite database
- ✅ **Graceful Shutdown** - Tắt bot an toàn
- ✅ **Auto-restart** - Tự động khởi động lại

</td>
</tr>
</table>

---

## 🛠️ Yêu cầu hệ thống

| Yêu cầu | Phiên bản |
|---------|-----------|
| **Node.js** | ≥ 16.0.0 |
| **NPM** | ≥ 8.0.0 |
| **Facebook Account** | Để lấy fbstate |
| **Internet** | Kết nối ổn định |

---

## 🚀 Cài đặt

### 1️⃣ Clone Repository
```bash
git clone https://github.com/NTV-gnouv/ConvoX
cd ConvoX
```

### 2️⃣ Cài đặt Dependencies
```bash
npm install
```

### 3️⃣ Cấu hình Environment Variables
Tạo file `.env` từ template:
```bash
cp env.example .env
```

Chỉnh sửa file `.env` và điền thông tin của bạn:
```env
# Admin User IDs (Facebook UIDs)
ADMIN_UIDS=1000123456789 1000234567891

# Bot Information
BOT_NAME=ConvoX Bot
BOT_PREFIX=!
BOT_VERSION=1.0.0

# Logging
LOG_LEVEL=info
LOG_COLORS=true
```

### 4️⃣ Cấu hình Facebook State
Tạo file `fbstate.json` trong thư mục gốc:
```json
{
  "fbstate": [
    // Dán fbstate của bạn vào đây
    // Lấy từ fca-unofficial hoặc các tool tương tự
  ]
}
```

### 5️⃣ Cấu hình Bot
Chỉnh sửa file `config/bot.json`:
```json
{
  "bot": {
    "name": "ConvoX Bot",
    "prefix": "!",
    "admin": ["YOUR_FACEBOOK_ID"],
    "features": {
      "menu": true,
      "logging": true,
      "autoRestart": true
    }
  }
}
```

### 6️⃣ Chạy Bot
```bash
npm start
```

---

## 📁 Cấu trúc dự án

```
ConvoX/
├── 📁 config/                 # Cấu hình bot
│   ├── 📄 bot.json           # Cấu hình chính
│   ├── 📄 commands.json      # Định nghĩa commands
│   ├── 📄 plugins.json       # Cấu hình plugins
│   └── 📄 permissions.json   # Phân quyền
├── 📁 core/                  # Core system
│   ├── 📄 BotManager.js      # Quản lý bot chính
│   ├── 📄 CommandHandler.js  # Xử lý lệnh
│   ├── 📄 PluginManager.js   # Quản lý plugin
│   ├── 📄 AuthManager.js     # Quản lý phân quyền
│   ├── 📄 Logger.js          # Hệ thống log
│   ├── 📄 MenuSystem.js      # Hệ thống menu
│   └── 📄 ErrorLogger.js     # Log lỗi
├── 📁 plugins/               # Plugin system
│   ├── 📁 admin/             # Plugin admin
│   ├── 📁 help/              # Plugin help
│   ├── 📁 info/              # Plugin thông tin
│   ├── 📁 menu/              # Plugin menu
│   ├── 📁 ping/              # Plugin ping
│   └── 📁 systemadmin/       # Plugin system admin
├── 📁 Fca_Database/          # Database
│   └── 📄 database.sqlite   # SQLite database
├── 📄 fbstate.json          # Facebook state
├── 📄 fca-config.json       # FCA config
├── 📄 package.json          # Dependencies
├── 📄 index.js              # Main entry point
└── 📄 LICENSE               # MIT License
```

---

## 🎮 Sử dụng

### 📋 Lệnh cơ bản
| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `!menu` | Hiển thị menu chính | `!menu` |
| `!help` | Hướng dẫn sử dụng | `!help` |
| `!info` | Thông tin bot | `!info` |
| `!ping` | Kiểm tra ping | `!ping` |

### 🎯 Lệnh giải trí
| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `!dice` | Gieo xúc xắc | `!dice` |
| `!flip` | Tung đồng xu | `!flip` |
| `!joke` | Kể chuyện cười | `!joke` |

### 👑 Lệnh Admin (chỉ Owner)
| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `!admin grant <userID>` | Cấp quyền Moderator | `!admin grant 1000123456789` |
| `!admin revoke <userID>` | Thu hồi quyền Moderator | `!admin revoke 1000123456789` |
| `!group allow <threadID>` | Cho phép nhóm sử dụng bot | `!group allow 1234567890` |
| `!group block <threadID>` | Chặn nhóm | `!group block 1234567890` |
| `!restart` | Khởi động lại bot | `!restart` |

### 🎯 Menu System
1. Gõ `!menu` để xem các category
2. Chọn số thứ tự category (VD: 1, 2, 3...)
3. Bot sẽ hiển thị danh sách lệnh trong category đó

---

## 🔧 Plugin Development

### 📁 Cấu trúc Plugin
```
plugins/
├── plugin-name/
│   ├── 📄 index.js          # Plugin chính
│   ├── 📄 config.json       # Cấu hình plugin (optional)
│   └── 📄 README.md         # Hướng dẫn plugin (optional)
```

### 💻 Ví dụ Plugin
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
            category: 'general',
            cooldown: 5,
            adminOnly: false
        });
    }

    async handleHello(event) {
        await this.api.sendMessage('Xin chào!', event.threadID);
    }
}

module.exports = MyPlugin;
```

---

## 🔐 Hệ thống phân quyền

### 👥 4 Cấp độ quyền
| Cấp độ | Tên | Mô tả | Quyền |
|--------|-----|-------|-------|
| **0** | 👤 User | Người dùng thường | Sử dụng lệnh cơ bản |
| **1** | 👮 Moderator | Quản lý cơ bản | Quản lý thành viên |
| **2** | 🔧 Admin | Quản trị hệ thống | Quản lý bot |
| **3** | 👑 Owner | Chủ sở hữu bot | Toàn quyền |

### ⚙️ Cấu hình phân quyền
Cấu hình trong file `.env` (đã tạo ở bước 3):
```env
# Admin User IDs (Facebook UIDs)
ADMIN_UIDS=1000123456789 1000234567891

# Bot Configuration
BOT_PREFIX=!
BOT_NAME=ConvoX
BOT_VERSION=1.0.0

# Group Management
GROUP_MODE=whitelist
```

---

## 🏢 Quản lý nhóm chat

### ✅ Chế độ Whitelist (mặc định)
- Bot **CHỈ** hoạt động trong các nhóm được phép
- Phù hợp khi bạn muốn kiểm soát chặt chẽ
- Sử dụng lệnh `!group allow <threadID>` để thêm nhóm

### ❌ Chế độ Blacklist  
- Bot hoạt động trong **TẤT CẢ** nhóm
- Chỉ những nhóm bị chặn mới không thể sử dụng bot
- Phù hợp khi bạn muốn cho phép rộng rãi nhưng chặn một số nhóm cụ thể
- Sử dụng lệnh `!group block <threadID>` để chặn nhóm

---

## 📊 Logging System

### 📈 Mức độ Logging
| Mức độ | Mô tả | Sử dụng |
|--------|-------|---------|
| **debug** | Thông tin chi tiết | Debug |
| **info** | Thông tin chung | Mặc định |
| **warn** | Cảnh báo | Cảnh báo |
| **error** | Lỗi | Xử lý lỗi |
| **silent** | Tắt hoàn toàn | Production |

### ⚙️ Cấu hình Logging
```json
{
  "logging": {
    "level": "info",
    "enableColors": true,
    "enableFileLogging": false,
    "logFile": "logs/bot.log"
  }
}
```

---

## 🛠️ Troubleshooting

### ❌ Lỗi kết nối Facebook
1. ✅ Kiểm tra `fbstate.json` có đúng không
2. ✅ Đảm bảo Facebook account không bị khóa
3. ✅ Thử tạo appstate mới
4. ✅ Kiểm tra kết nối internet

### 🔌 Plugin không load
1. ✅ Kiểm tra syntax của plugin
2. ✅ Xem logs để debug
3. ✅ Đảm bảo plugin implement đúng interface
4. ✅ Kiểm tra file `plugins.json`

### 🤖 Bot không phản hồi
1. ✅ Kiểm tra prefix trong config
2. ✅ Đảm bảo bot có quyền gửi tin nhắn
3. ✅ Kiểm tra network connection
4. ✅ Xem logs để tìm lỗi

---

## 📦 Dependencies

### 🔧 Core Dependencies
- **@dongdev/fca-unofficial** - Facebook Chat API
- **chalk** - Terminal colors
- **dotenv** - Environment variables
- **figlet** - ASCII art
- **fs-extra** - File system utilities
- **gradient-string** - Gradient colors

### 🛠️ Dev Dependencies
- **nodemon** - Auto-restart development

---

## 🤝 Đóng góp

Chúng tôi hoan nghênh mọi đóng góp! Hãy làm theo các bước sau:

1. 🍴 **Fork** repository này
2. 🌿 **Tạo branch** mới cho feature (`git checkout -b feature/AmazingFeature`)
3. 💾 **Commit** các thay đổi (`git commit -m 'Add some AmazingFeature'`)
4. 📤 **Push** lên branch (`git push origin feature/AmazingFeature`)
5. 🔄 **Mở Pull Request**

### 📋 Quy tắc đóng góp
- ✅ Tuân thủ coding style hiện tại
- ✅ Thêm comments cho code phức tạp
- ✅ Test kỹ trước khi submit
- ✅ Cập nhật documentation nếu cần

---

## 📄 Giấy phép

Dự án này được cấp phép theo **MIT License**. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## 👨‍💻 Tác giả

<div align="center">

### 🎯 **ConvoX Team**

| Thành viên | Vai trò | Liên hệ |
|------------|---------|---------|
| **Thanh Vương** | 👑 Lead Developer & Creator | [GitHub](https://github.com/NTV-gnouv) |
| **ConvoX Team** | 👥 Development Team | [GitHub](https://github.com/ConvoXTeam) |

</div>

---

## 🌟 Dự án liên quan

- 🔗 **GitHub Repository**: [ConvoX](https://github.com/NTV-gnouv/ConvoX)

---

<div align="center">

### 🎉 **Chúc bạn sử dụng ConvoX Bot vui vẻ!**

**⭐ Nếu bạn thích dự án này, hãy cho chúng tôi một star! ⭐**

[![GitHub stars](https://img.shields.io/github/stars/NTV-gnouv/ConvoX?style=social)](https://github.com/NTV-gnouv/ConvoX)
[![GitHub forks](https://img.shields.io/github/forks/NTV-gnouv/ConvoX?style=social)](https://github.com/NTV-gnouv/ConvoX)

---

*Made with ❤️ by ConvoX Team*

</div>