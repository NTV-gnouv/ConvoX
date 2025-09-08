# 🧪 Test Directory

Thư mục này chứa các file test và công cụ hỗ trợ cho ConvoX Bot.

## 📁 Cấu trúc

```
test/
├── README.md             # File này
├── test-cookie.js        # Test và kiểm tra cookie Facebook
├── test-auto-restart.js  # Test hệ thống auto restart
└── cookie-manager.js     # Công cụ quản lý cookie
```

## 🛠️ Các Tool

### 1. Test Cookie (`test-cookie.js`)
Kiểm tra tính hợp lệ của cookie Facebook:
```bash
npm run test-cookie
```

**Chức năng:**
- ✅ Đọc và validate cookie
- 👤 Lấy User ID từ cookie
- ⏰ Kiểm tra thời hạn cookie
- 🔄 Convert sang appState format
- 📋 Hiển thị thông tin chi tiết

### 2. Test Auto Restart (`test-auto-restart.js`)
Kiểm tra hệ thống auto restart:
```bash
npm run test-restart
```

**Chức năng:**
- 🔍 Test logic shouldRestart với các loại lỗi
- 📊 Kiểm tra restart counter và limits
- ⏱️ Test reset counter mechanism
- 📋 Hiển thị summary của restart policies

### 3. Cookie Manager (`cookie-manager.js`)
Quản lý cookie Facebook:
```bash
npm run cookie [command]
```

**Commands:**
- `show` - Hiển thị thông tin cookie hiện tại
- `restore` - Khôi phục từ backup
- `delete` - Xóa cookie hiện tại
- `update` - Cập nhật cookie mới

**Ví dụ:**
```bash
npm run cookie show      # Xem thông tin
npm run cookie restore   # Khôi phục backup
```

## 🔧 Scripts trong package.json

```json
{
  "scripts": {
    "test-cookie": "node test/test-cookie.js",
    "test-restart": "node test/test-auto-restart.js",
    "cookie": "node test/cookie-manager.js"
  }
}
```

## 📝 Ghi chú

- **test-cookie.js**: Chạy để kiểm tra cookie trước khi start bot
- **cookie-manager.js**: Sử dụng để quản lý cookie trong quá trình vận hành
- Tất cả tool đều có logging chi tiết và error handling
- Support cả cookie format và appState format
