# 🔒 CHÍNH SÁCH BẢO MẬT CONVOX BOT
# 🔒 CONVOX BOT PRIVACY POLICY

================================================================================
**Phiên bản:** 1.0  
**Ngày cập nhật:** 8 tháng 9, 2025  
**Áp dụng cho:** ConvoX Bot v1.0.0+
================================================================================

## 📋 MỤC LỤC | TABLE OF CONTENTS

1. [🇻🇳 PHIÊN BẢN TIẾNG VIỆT](#vietnamese)
2. [🇺🇸 ENGLISH VERSION](#english)

---

## 🇻🇳 PHIÊN BẢN TIẾNG VIỆT {#vietnamese}

### 🎯 **TỔNG QUAN**

ConvoX Bot là một framework chatbot mã nguồn mở được phát triển bởi ConvoX Team và Thanh Vương. Chúng tôi cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của người dùng.

### 📊 **DỮ LIỆU CHÚNG TÔI THU THẬP**

#### 🔹 **Dữ liệu Xác thực:**
- **Cookie Facebook**: Được lưu trữ cục bộ trong `/auth/cookies.json`
- **Session Token**: Tự động tạo và cập nhật cho việc đăng nhập
- **User ID**: Từ cookie để xác định tài khoản Facebook

#### 🔹 **Dữ liệu Hoạt động:**
- **Tin nhắn**: Chỉ xử lý, không lưu trữ vĩnh viễn
- **Lệnh bot**: Log để debug và cải thiện hiệu suất
- **Lỗi hệ thống**: Log trong `/logs/` để khắc phục sự cố

#### 🔹 **Dữ liệu Kỹ thuật:**
- **Thông tin thiết bị**: User-Agent, IP (chỉ để vượt checkpoint)
- **Timestamp**: Thời gian hoạt động và restart
- **Plugin data**: Dữ liệu của các plugin được cài đặt

### 🏠 **LỮU TRỮ DỮ LIỆU**

#### 📍 **Lưu trữ Cục bộ:**
- **Tất cả dữ liệu** được lưu trữ trên máy tính của bạn
- **Không có server trung tâm** nào thu thập dữ liệu
- **Bạn có toàn quyền kiểm soát** dữ liệu của mình

#### 🔐 **Bảo mật File:**
- File `/auth/` được **Git ignore** tự động
- Cookie và token được **mã hóa cục bộ**
- **Không backup** lên repository public

### 🔄 **SỬ DỤNG DỮ LIỆU**

#### ✅ **Mục đích Sử dụng:**
- **Xác thực**: Đăng nhập vào Facebook
- **Vận hành**: Xử lý tin nhắn và lệnh
- **Bảo trì**: Debug và cải thiện bot
- **Checkpoint**: Vượt qua kiểm tra bảo mật Facebook

#### ❌ **KHÔNG Sử dụng cho:**
- Bán hoặc chia sẻ với bên thứ ba
- Quảng cáo hoặc marketing
- Thu thập dữ liệu trái phép
- Mục đích thương mại trái phép

### 👥 **CHIA SẺ DỮ LIỆU**

#### 🚫 **Chúng tôi KHÔNG chia sẻ:**
- **Cookie Facebook** của bạn
- **Tin nhắn cá nhân**
- **Thông tin tài khoản**
- **Dữ liệu nhạy cảm** bất kỳ

#### ℹ️ **Dữ liệu có thể chia sẻ:**
- **Thống kê anonymous**: Số lệnh sử dụng (không có thông tin cá nhân)
- **Bug reports**: Lỗi kỹ thuật (đã loại bỏ thông tin nhạy cảm)

### 🔒 **BẢO MẬT & AN TOÀN**

#### 🛡️ **Biện pháp Bảo vệ:**
- **Local encryption**: Mã hóa dữ liệu cục bộ
- **Secure sessions**: Quản lý session an toàn
- **Auto cleanup**: Tự động dọn dẹp dữ liệu cũ
- **Git protection**: Tự động ignore file nhạy cảm

#### ⚠️ **Rủi ro Tiềm ẩn:**
- **Facebook ToS**: Sử dụng bot có thể vi phạm điều khoản Facebook
- **Account security**: Nguy cơ bị khóa tài khoản
- **Cookie exposure**: Không chia sẻ cookie với người khác

### 👤 **QUYỀN CỦA NGƯỜI DÙNG**

#### ✅ **Bạn có quyền:**
- **Xem**: Tất cả dữ liệu đang được lưu trữ
- **Sửa**: Chỉnh sửa cấu hình và dữ liệu
- **Xóa**: Xóa bất kỳ dữ liệu nào
- **Xuất**: Export dữ liệu để sao lưu
- **Kiểm soát**: Bật/tắt tính năng theo ý muốn

#### 🗑️ **Xóa Dữ liệu:**
```bash
# Xóa tất cả dữ liệu xác thực
rm -rf auth/

# Xóa logs
rm -rf logs/

# Reset hoàn toàn
npm run reset
```

### 📞 **LIÊN HỆ & HỖ TRỢ**

#### 📧 **Thông tin Liên hệ:**
- **Email**: convoxteam@gmail.com
- **GitHub**: https://github.com/NTV-gnouv/ConvoX
- **Issues**: Báo cáo vấn đề bảo mật qua GitHub Issues

#### 🚨 **Báo cáo Bảo mật:**
Nếu phát hiện lỗ hổng bảo mật, vui lòng:
1. **KHÔNG** public thông tin
2. Email trực tiếp cho team
3. Cung cấp chi tiết kỹ thuật
4. Chờ phản hồi trong 72h

### 📝 **CẬP NHẬT CHÍNH SÁCH**

- Chính sách có thể được cập nhật
- Thông báo qua GitHub releases
- Phiên bản cũ được lưu trữ trong `/docs/policies/`

---

## 🇺🇸 ENGLISH VERSION {#english}

### 🎯 **OVERVIEW**

ConvoX Bot is an open-source chatbot framework developed by ConvoX Team and Thanh Vương. We are committed to protecting user privacy and personal data.

### 📊 **DATA WE COLLECT**

#### 🔹 **Authentication Data:**
- **Facebook Cookies**: Stored locally in `/auth/cookies.json`
- **Session Tokens**: Auto-generated and updated for login
- **User ID**: From cookies to identify Facebook account

#### 🔹 **Activity Data:**
- **Messages**: Processed only, not permanently stored
- **Bot Commands**: Logged for debugging and performance improvement
- **System Errors**: Logged in `/logs/` for troubleshooting

#### 🔹 **Technical Data:**
- **Device Information**: User-Agent, IP (only for checkpoint bypass)
- **Timestamps**: Activity and restart times
- **Plugin Data**: Data from installed plugins

### 🏠 **DATA STORAGE**

#### 📍 **Local Storage:**
- **All data** is stored on your computer
- **No central server** collects data
- **You have full control** over your data

#### 🔐 **File Security:**
- `/auth/` folder is **automatically Git ignored**
- Cookies and tokens are **locally encrypted**
- **No backup** to public repositories

### 🔄 **DATA USAGE**

#### ✅ **Usage Purposes:**
- **Authentication**: Login to Facebook
- **Operation**: Process messages and commands
- **Maintenance**: Debug and improve bot
- **Checkpoint**: Bypass Facebook security checks

#### ❌ **NOT Used for:**
- Selling or sharing with third parties
- Advertising or marketing
- Unauthorized data collection
- Unauthorized commercial purposes

### 👥 **DATA SHARING**

#### 🚫 **We DO NOT share:**
- **Your Facebook cookies**
- **Personal messages**
- **Account information**
- **Any sensitive data**

#### ℹ️ **Data that may be shared:**
- **Anonymous statistics**: Command usage count (no personal info)
- **Bug reports**: Technical errors (sensitive info removed)

### 🔒 **SECURITY & SAFETY**

#### 🛡️ **Protection Measures:**
- **Local encryption**: Encrypt local data
- **Secure sessions**: Safe session management
- **Auto cleanup**: Automatic cleanup of old data
- **Git protection**: Auto-ignore sensitive files

#### ⚠️ **Potential Risks:**
- **Facebook ToS**: Using bots may violate Facebook terms
- **Account security**: Risk of account suspension
- **Cookie exposure**: Don't share cookies with others

### 👤 **USER RIGHTS**

#### ✅ **You have the right to:**
- **View**: All stored data
- **Edit**: Modify configuration and data
- **Delete**: Remove any data
- **Export**: Export data for backup
- **Control**: Enable/disable features as desired

#### 🗑️ **Data Deletion:**
```bash
# Delete all authentication data
rm -rf auth/

# Delete logs
rm -rf logs/

# Complete reset
npm run reset
```

### 📞 **CONTACT & SUPPORT**

#### 📧 **Contact Information:**
- **Email**: convoxteam@gmail.com
- **GitHub**: https://github.com/NTV-gnouv/ConvoX
- **Issues**: Report security issues via GitHub Issues

#### 🚨 **Security Reporting:**
If you discover security vulnerabilities:
1. **DO NOT** make information public
2. Email directly to team
3. Provide technical details
4. Wait for response within 72h

### 📝 **POLICY UPDATES**

- Policy may be updated
- Notifications via GitHub releases
- Old versions archived in `/docs/policies/`

================================================================================
## 📜 **DISCLAIMER | TỪ CHỐI TRÁCH NHIỆM**

🇻🇳 **Tiếng Việt:**
ConvoX Bot được cung cấp "như vậy" mà không có bất kỳ bảo hành nào về bảo mật. 
Người dùng tự chịu trách nhiệm về việc sử dụng và tuân thủ các điều khoản của Facebook.

🇺🇸 **English:**
ConvoX Bot is provided "as is" without any security warranties. 
Users are responsible for their own usage and compliance with Facebook's terms.

================================================================================
**© 2025 ConvoX Team & Thanh Vương | All Rights Reserved**
================================================================================
