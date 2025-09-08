<div align="center">

<img src="ConvoXlogo.jpg" alt="ConvoX Logo" width="80" height="80">

# 🤖 ConvoX ChatBot

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/NTV-gnouv/ConvoX)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D16.0.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Facebook](https://img.shields.io/badge/facebook-messenger-1877F2.svg)](https://facebook.com/)

**ConvoX là một Facebook Chat Bot thế hệ mới với kiến trúc hiện đại và nhiều tính năng tiên tiến**

*Được phát triển bởi ConvoX Team với tình yêu và đam mê*

[🚀 Bắt đầu](#-cài-đặt) • [📖 Tài liệu](#-tính-năng-nổi-bật) • [🔧 Plugin](#-plugin-development) • [❓ Hỗ trợ](#-troubleshooting)

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
- ✅ **Group Management** - Quản lý nhóm chat, whitelist/blacklist, pending
- ✅ **Approval & Notifications** - Phê duyệt nhóm/người dùng, tự động thông báo đến Admin/Owner khi bot vào box mới; Admin có thể reply thông báo với "!group allow" để duyệt nhanh, sau khi duyệt chủ box sẽ được nâng quyền Moderator (chỉ trong box đó)
- ✅ **Ephemeral UI** - Menu/chi tiết tự xóa sau thời gian ngắn để tránh spam chat
- ✅ **Assistant Ngọc (AI Gemini)** - Trợ lý hội thoại không cần prefix
- ✅ **Auto Download (yt-dlp)** - Tự phát hiện link và tải video/ảnh không cần prefix
- ✅ **Message Translation (trans)** - Dịch đa ngôn ngữ (Google Translate)
- ✅ **Database Support** - SQLite database
- ✅ **Graceful Shutdown** - Tắt bot an toàn, Auto-restart
Cập nhật lớn trong thời gian tới.

</td>
</tr>
</table>

---

## 🛠️ Yêu cầu hệ thống

| Yêu cầu | Phiên bản |
|---------|-----------|
| **Node.js** | ≥ 16.0.0 |
| **NPM** | ≥ 8.0.0 |
| **Facebook Account** | Để lấy cookie/fbstate |
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

Chỉnh sửa file `.env` (chỉ các thông số vui lòng giữ lại credit):


### 4️⃣ Cấu hình Facebook Authentication
Cấu hình cookie Facebook trong thư mục `auth/`:

#### 🍪 **Phương pháp 1: Cookie (Khuyến nghị)**
Tạo file `auth/cookies.json`:

#### 📋 **Phương pháp 2: FBState (Fallback)**
Tạo file `auth/fbstate.json`:
```json
{
  "fbstate": [
    // Dán fbstate của bạn vào đây
  ]
}
```

#### 🔧 **Test Cookie**
```bash
npm run test-cookie  # Kiểm tra cookie hợp lệ
npm run cookie show  # Xem thông tin cookie
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
├── 📁 auth/                  # Authentication files (PRIVATE)
│   ├── 📄 cookies.json       # Facebook cookies (MAIN)
│   ├── 📄 fbstate.json       # Facebook state (FALLBACK)
│   └── 📄 README.md          # Auth documentation
├── 📁 config/                # Bot configuration
│   ├── 📄 bot.json           # Main config
│   ├── 📄 commands.json      # Command definitions  
│   ├── 📄 plugins.json       # Plugin config
│   └── 📄 permissions.json   # Permissions
├── 📁 core/                  # Core system
│   ├── 📄 BotManager.js      # Main bot manager
│   ├── 📄 CommandHandler.js  # Command processing
│   ├── 📄 PluginManager.js   # Plugin management
│   ├── 📄 AuthManager.js     # Authentication management
│   ├── 📄 CookieAuth.js      # Cookie authentication
│   ├── 📄 Logger.js          # Logging system
│   ├── 📄 MenuSystem.js      # Menu system
│   └── 📄 ErrorLogger.js     # Error logging
├── 📁 plugins/               # Plugin system
│   ├── 📁 assistant_ngoc/    # 🤖 AI Assistant (Gemini-powered)
│   ├── 📁 autodown/          # 📥 Auto download media
│   ├── 📁 admin/             # 👑 Admin plugin
│   ├── 📁 info/              # ℹ️ Info plugin
│   ├── 📁 menu/              # 📋 Menu plugin
│   ├── 📁 ping/              # 🏓 Ping plugin
│   └── 📁 ...                # (more plugins)
├── 📁 test/                  # Test tools
│   ├── � README.md          # Test documentation
│   ├── 📄 test-cookie.js     # Cookie testing tool
│   └── 📄 cookie-manager.js  # Cookie management tool
├── 📁 Fca_Database/          # Database
│   └── 📄 database.sqlite    # SQLite database
├── 📄 fca-config.json        # FCA config
├── 📄 package.json           # Dependencies
├── 📄 index.js               # Main entry point
├── 📄 LICENSE                # MIT License
└── 📄 .env.example           # ENV template
```

---

## 🎮 Sử dụng

### 🛠️ Lệnh nổi bật

Xem thêm: vào `!menu` để xem đầy đủ lệnh quản trị.

### 🤖 Trợ lý Ngọc ( chức năng nổi bật)
- Cách gọi: gõ từ khóa “ngọc” trong tin nhắn, hoặc tag bot, hoặc reply vào tin nhắn trước của Ngọc.
- Mô tả: Trợ lý AI dùng Google Gemini, giữ ngữ cảnh hội thoại ngắn trong box.
- Cấu hình:
    - ENV: `GEMINI_API_KEY` (bắt buộc), `GEMINI_MODEL` (tùy chọn, mặc định: gemini-2.5-flash).
    - Persona: `plugins/assistant_ngoc/training.txt` (có thể chỉnh lời thoại).
    - Lưu ý: Tin nhắn bắt đầu bằng prefix (ví dụ `!`) sẽ không kích hoạt trợ lý.

### 📥 Auto download (không cần prefix) ( chức năng nổi bật)
- Cách dùng: chỉ cần gửi 1 link thuộc nền tảng hỗ trợ, bot tự tải về video/ảnh và gửi lại.
- Phản hồi: bot đặt reaction ⌛ khi xử lý; ✅ khi tải thành công; ❌ nếu không có video trong bài viết.
- Nền tảng hỗ trợ:
    - facebook.com, fb.watch, m.facebook.com
    - tiktok.com, vt.tiktok.com, v.douyin.com (hỗ trợ slideshow ảnh)
    - instagram.com
    - youtube.com, youtu.be
- Ghi chú: Không có lệnh/prefix; thời gian xử lý phụ thuộc dung lượng/nền tảng.

## 🔧 Plugin Development

### 📁 Tạo Plugin Mới

#### 1️⃣ Tạo thư mục plugin
```bash
mkdir plugins/plugin-name
cd plugins/plugin-name
```

#### 2️⃣ Cấu trúc Plugin
```
plugins/
├── plugin-name/
│   ├── 📄 index.js          # Plugin chính (bắt buộc)
│   ├── 📄 config.json       # Cấu hình plugin (tùy chọn)
│   ├── 📄 README.md         # Hướng dẫn plugin (bắt buộc, theo quy ước)
│   └── 📁 assets/           # Tài nguyên plugin (tùy chọn)
```

### 💻 Template Plugin Cơ Bản

#### 📄 `plugins/plugin-name/index.js`
```javascript
'use strict';

/**
 * Plugin Name v1.0.0
 * Mô tả chức năng của plugin
 * 
 * @author Your Name
 * @version 1.0.0

class PluginName {
    constructor(api, config, authManager, logger) {
        this.api = api;
        this.config = config;
        this.authManager = authManager;
        this.logger = logger;
        this.name = 'Plugin Name';
        this.version = '1.0.0';
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Khởi tạo plugin
            console.log(`[${this.name}] Plugin initialized successfully`);
            this.isInitialized = true;
        } catch (error) {
            console.error(`[${this.name}] Init failed:`, error.message);
            throw error;
        }
    }

    registerCommands(commandHandler) {
        // Đăng ký commands
        commandHandler.registerCommand('hello', this.handleHello.bind(this), {
            description: 'Chào hỏi người dùng',
            usage: '!hello',
            category: 'general',
            cooldown: 5,
            adminOnly: false
        });
    }

    async handleHello(event) {
        const { threadID, senderID } = event;
        await this.api.sendMessage('Xin chào! 👋', threadID);
    }

    async cleanup() {
        // Dọn dẹp khi plugin bị tắt
        console.log(`[${this.name}] Plugin cleaned up`);
    }

    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: 'Mô tả plugin',
            credits: 'Your Name'
        };
    }
}

module.exports = PluginName;
```

### ⚙️ Cấu hình Plugin

#### 📄 `plugins/plugin-name/config.json` (Tùy chọn)
```json
{
    "enabled": true,
    "settings": {
        "cooldown": 5,
        "maxUsage": 10,
        "customSetting": "value"
    }
}
```

#### 📄 `config/plugins.json` - Đăng ký Plugin
```json
{
    "plugins": {
        "defaultPlugins": [
            "plugin-name"
        ],
        "pluginConfig": {
            "plugin-name": {
                "enabled": true,
                "cooldown": 5
            }
        }
    }
}
```

### 📝 Best Practices

#### ✅ **Nên làm:**
- Sử dụng try-catch cho error handling
- Log đầy đủ thông tin debug
- Validate input parameters
- Sử dụng cooldown cho commands
- Cleanup resources khi tắt plugin

#### ❌ **Không nên:**
- Block main thread với sync operations
- Hardcode sensitive data
- Tạo infinite loops
- Ignore error handling
- Sử dụng deprecated APIs

#### 📜 Quy ước repo
- Mỗi plugin phải có `README.md` riêng mô tả lệnh, quyền, cấu hình.
- Nên có cơ chế “credit ẩn” tương tự các plugin mặc định (tôn trọng tác giả ConvoX).


### 🔗 Tài Nguyên Hữu Ích

- 📚 **API Documentation**: Xem `core/` để hiểu API
- 🎯 **Plugin Examples**: Tham khảo `plugins/assistant_ngoc/` và `plugins/autodown/`
- 🛠️ **Debug Tools**: Sử dụng logger và console.log
- 📖 **Environment**: Sử dụng `.env` cho config sensitive

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
Cấu hình trong `.env` (xem mục “Cấu hình Environment Variables”). Tham số liên quan: `OWNER_UIDS`, `ADMIN_UIDS`, `BOT_PREFIX` và (tùy chọn) `GROUP_MODE`.

### 👮 Moderator theo box (scoped)
- Moderator được giới hạn theo từng box đã duyệt. Ra khỏi box đó thì quyền Moderator không còn hiệu lực (kể cả ở box đã duyệt khác).
- Owner có toàn quyền ở mọi nơi (toàn hệ thống).
- Admin có quyền ở mọi nơi và có thể cấp/gỡ Moderator cho bất cứ box nào đã duyệt.
- Moderator chỉ có thể cấp/gỡ Moderator cho người khác trong chính box mà họ đang là Moderator.


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
1. ✅ Kiểm tra `auth/cookies.json` hoặc `auth/fbstate.json` có đúng không
2. ✅ Chạy `npm run test-cookie` để test cookie
3. ✅ Đảm bảo Facebook account không bị khóa
4. ✅ Thử lấy cookie/fbstate mới từ browser
5. ✅ Kiểm tra kết nối internet

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
git
| Thành viên | Vai trò | Liên hệ |
|------------|---------|---------|
| **Thanh Vương** | 👑 Lead Developer & Creator | [GitHub](https://github.com/NTV-gnouv) • 📧 ngthnhvuong@gmail.com |
| **ConvoX Team** | 👥 Development Team | [GitHub](https://github.com/NTV-gnouv/ConvoX) • 📧 convoxteam@gmail.com |

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