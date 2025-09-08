const fs = require('fs-extra');
const path = require('path');

class CookieManager {
    constructor() {
        this.cookiePath = './auth/cookies.json';
        this.backupPath = './auth/cookies_backup.json';
    }

    /**
     * Cập nhật cookie từ dữ liệu mới
     */
    async updateCookies(newCookies) {
        try {
            // Backup cookie cũ
            if (await fs.pathExists(this.cookiePath)) {
                await fs.copy(this.cookiePath, this.backupPath);
                console.log('📦 Đã backup cookie cũ');
            }

            // Validate format
            if (!Array.isArray(newCookies)) {
                throw new Error('Cookie phải là một mảng');
            }

            // Kiểm tra cookie bắt buộc
            const requiredKeys = ['c_user', 'xs'];
            const existingKeys = newCookies.map(c => c.key);
            
            for (const key of requiredKeys) {
                if (!existingKeys.includes(key)) {
                    throw new Error(`Cookie thiếu key bắt buộc: ${key}`);
                }
            }

            // Chuẩn hóa format
            const normalizedCookies = newCookies.map(cookie => ({
                key: cookie.key,
                value: cookie.value,
                domain: cookie.domain || 'facebook.com',
                path: cookie.path || '/',
                creation: cookie.creation || Date.now(),
                lastAccessed: cookie.lastAccessed || Date.now()
            }));

            // Lưu cookie mới
            await fs.writeJson(this.cookiePath, normalizedCookies, { spaces: 2 });
            console.log('✅ Đã cập nhật cookie thành công');

            // Hiển thị thông tin
            const cUserCookie = normalizedCookies.find(c => c.key === 'c_user');
            if (cUserCookie) {
                console.log(`👤 User ID: ${cUserCookie.value}`);
            }

            return true;
        } catch (error) {
            console.error('❌ Lỗi cập nhật cookie:', error.message);
            
            // Khôi phục backup nếu có lỗi
            if (await fs.pathExists(this.backupPath)) {
                await fs.copy(this.backupPath, this.cookiePath);
                console.log('🔄 Đã khôi phục cookie từ backup');
            }
            
            return false;
        }
    }

    /**
     * Khôi phục cookie từ backup
     */
    async restoreFromBackup() {
        try {
            if (!await fs.pathExists(this.backupPath)) {
                throw new Error('Không tìm thấy file backup');
            }

            await fs.copy(this.backupPath, this.cookiePath);
            console.log('✅ Đã khôi phục cookie từ backup');
            return true;
        } catch (error) {
            console.error('❌ Lỗi khôi phục backup:', error.message);
            return false;
        }
    }

    /**
     * Hiển thị thông tin cookie hiện tại
     */
    async showCurrentCookies() {
        try {
            if (!await fs.pathExists(this.cookiePath)) {
                console.log('❌ Không tìm thấy file cookie');
                return;
            }

            const cookies = await fs.readJson(this.cookiePath);
            console.log('🍪 Cookie hiện tại:');
            console.log(`   📊 Số lượng: ${cookies.length}`);
            
            cookies.forEach((cookie, index) => {
                const value = cookie.value.length > 20 ? cookie.value.substring(0, 20) + '...' : cookie.value;
                console.log(`   ${index + 1}. ${cookie.key}: ${value}`);
            });

            const cUserCookie = cookies.find(c => c.key === 'c_user');
            if (cUserCookie) {
                console.log(`   👤 User ID: ${cUserCookie.value}`);
            }

            // Kiểm tra thời hạn
            const now = Date.now();
            const oldestCookie = Math.min(...cookies.map(c => c.lastAccessed || c.creation || now));
            const daysSinceUpdate = Math.floor((now - oldestCookie) / (1000 * 60 * 60 * 24));
            
            if (daysSinceUpdate > 7) {
                console.log(`   ⚠️  Cookie đã ${daysSinceUpdate} ngày tuổi, nên cập nhật`);
            } else {
                console.log(`   ✅ Cookie còn mới (${daysSinceUpdate} ngày tuổi)`);
            }

        } catch (error) {
            console.error('❌ Lỗi đọc cookie:', error.message);
        }
    }

    /**
     * Xóa cookie (với xác nhận)
     */
    async deleteCookies() {
        try {
            if (!await fs.pathExists(this.cookiePath)) {
                console.log('❌ Không tìm thấy file cookie để xóa');
                return;
            }

            // Backup trước khi xóa
            await fs.copy(this.cookiePath, this.backupPath);
            await fs.remove(this.cookiePath);
            
            console.log('✅ Đã xóa cookie (đã backup)');
            return true;
        } catch (error) {
            console.error('❌ Lỗi xóa cookie:', error.message);
            return false;
        }
    }
}

// CLI Interface
async function main() {
    const cookieManager = new CookieManager();
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'show':
        case 'info':
            await cookieManager.showCurrentCookies();
            break;
            
        case 'restore':
            await cookieManager.restoreFromBackup();
            break;
            
        case 'delete':
            await cookieManager.deleteCookies();
            break;
            
        case 'update':
            if (args[1]) {
                try {
                    const newCookies = JSON.parse(args[1]);
                    await cookieManager.updateCookies(newCookies);
                } catch (error) {
                    console.error('❌ Dữ liệu cookie không hợp lệ');
                }
            } else {
                console.log('❌ Vui lòng cung cấp dữ liệu cookie');
                console.log('   Ví dụ: node cookie-manager.js update \'[{"key":"c_user","value":"123"}]\'');
            }
            break;
            
        default:
            console.log('🍪 Cookie Manager - ConvoX Bot');
            console.log('');
            console.log('Cách sử dụng:');
            console.log('  node cookie-manager.js show     - Hiển thị cookie hiện tại');
            console.log('  node cookie-manager.js restore  - Khôi phục từ backup');
            console.log('  node cookie-manager.js delete   - Xóa cookie hiện tại');
            console.log('  node cookie-manager.js update   - Cập nhật cookie mới');
            console.log('');
            console.log('Ví dụ cập nhật cookie:');
            console.log('  node cookie-manager.js update \'[{"key":"c_user","value":"123"}]\'');
    }
}

if (require.main === module) {
    main();
}

module.exports = CookieManager;
