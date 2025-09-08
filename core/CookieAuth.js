const fs = require('fs-extra');
const path = require('path');

class CookieAuth {
    constructor(logger = null) {
        this.logger = logger;
        this.cookiePath = './auth/cookies.json';
    }

    /**
     * Chuyển đổi cookie format thành appState format cho fca-unofficial
     */
    convertCookiesToAppState(cookies) {
        if (!Array.isArray(cookies)) {
            throw new Error('Cookie phải là một mảng');
        }

        const appState = [];
        
        for (const cookie of cookies) {
            const appStateItem = {
                key: cookie.key,
                value: cookie.value,
                domain: cookie.domain || '.facebook.com',
                path: cookie.path || '/',
                hostOnly: false,
                creation: new Date(cookie.creation || Date.now()),
                lastAccessed: new Date(cookie.lastAccessed || Date.now())
            };

            // Thêm secure và httpOnly cho một số cookie đặc biệt
            if (['xs', 'c_user', 'datr'].includes(cookie.key)) {
                appStateItem.secure = true;
                appStateItem.httpOnly = true;
            }

            appState.push(appStateItem);
        }

        return appState;
    }

    /**
     * Đọc cookie từ file
     */
    async loadCookies() {
        try {
            if (!await fs.pathExists(this.cookiePath)) {
                throw new Error(`Không tìm thấy file cookie: ${this.cookiePath}`);
            }

            const cookieData = await fs.readJson(this.cookiePath);
            
            if (!Array.isArray(cookieData)) {
                throw new Error('Format cookie không hợp lệ. Phải là một mảng.');
            }

            if (this.logger) {
                this.logger.info(`Đã load ${cookieData.length} cookies từ ${this.cookiePath}`);
            }

            return cookieData;
        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Lỗi khi đọc file cookie');
            }
            throw error;
        }
    }

    /**
     * Lưu appState mới vào file cookie (backup)
     */
    async saveAppStateAsCookie(appState) {
        try {
            const backupPath = './auth/cookies_backup.json';
            const cookies = appState.map(item => ({
                key: item.key,
                value: item.value,
                domain: item.domain,
                path: item.path,
                creation: new Date(item.creation).getTime(),
                lastAccessed: new Date(item.lastAccessed).getTime()
            }));

            await fs.writeJson(backupPath, cookies, { spaces: 2 });
            
            if (this.logger) {
                this.logger.info(`Đã backup appState vào ${backupPath}`);
            }
        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Lỗi khi backup appState');
            }
        }
    }

    /**
     * Kiểm tra tính hợp lệ của cookie
     */
    validateCookies(cookies) {
        const requiredKeys = ['c_user', 'xs'];
        const existingKeys = cookies.map(c => c.key);
        
        for (const key of requiredKeys) {
            if (!existingKeys.includes(key)) {
                throw new Error(`Cookie thiếu key bắt buộc: ${key}`);
            }
        }

        // Kiểm tra c_user có phải là số không
        const cUserCookie = cookies.find(c => c.key === 'c_user');
        if (cUserCookie && !/^\d+$/.test(cUserCookie.value)) {
            throw new Error('Cookie c_user không hợp lệ');
        }

        return true;
    }

    /**
     * Xử lý checkpoint và retry logic
     */
    async handleCheckpoint(error, retryCallback) {
        if (!error || typeof error.message !== 'string') {
            return false;
        }

        const errorMsg = error.message.toLowerCase();
        const isCheckpoint = errorMsg.includes('checkpoint') || 
                           errorMsg.includes('security') ||
                           errorMsg.includes('verification') ||
                           errorMsg.includes('review');

        if (!isCheckpoint) {
            return false;
        }

        if (this.logger) {
            this.logger.warn('🔒 Phát hiện checkpoint Facebook. Đang thử vượt...');
        }

        // Thử các phương pháp vượt checkpoint
        const strategies = [
            this.bypassWithDelay.bind(this),
            this.bypassWithUserAgent.bind(this),
            this.bypassWithCookieRefresh.bind(this)
        ];

        for (let i = 0; i < strategies.length; i++) {
            try {
                if (this.logger) {
                    this.logger.info(`Đang thử phương pháp vượt checkpoint ${i + 1}/${strategies.length}`);
                }

                await strategies[i]();
                
                // Thử kết nối lại
                const result = await retryCallback();
                if (result) {
                    if (this.logger) {
                        this.logger.success('✅ Đã vượt checkpoint thành công!');
                    }
                    return true;
                }
            } catch (retryError) {
                if (this.logger) {
                    this.logger.warn(`Phương pháp ${i + 1} thất bại: ${retryError.message}`);
                }
            }
        }

        if (this.logger) {
            this.logger.error('❌ Không thể vượt checkpoint. Vui lòng cập nhật cookie mới.');
        }
        return false;
    }

    /**
     * Phương pháp 1: Delay và thử lại
     */
    async bypassWithDelay() {
        if (this.logger) {
            this.logger.info('Đang delay 30 giây...');
        }
        await this.sleep(30000);
    }

    /**
     * Phương pháp 2: Thay đổi User-Agent
     */
    async bypassWithUserAgent() {
        if (this.logger) {
            this.logger.info('Đang thử với User-Agent mới...');
        }
        
        // Cập nhật User-Agent ngẫu nhiên
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        process.env.USER_AGENT = randomUA;
        
        await this.sleep(5000);
    }

    /**
     * Phương pháp 3: Refresh cookie timestamps
     */
    async bypassWithCookieRefresh() {
        try {
            if (this.logger) {
                this.logger.info('Đang refresh timestamps của cookies...');
            }

            const cookies = await this.loadCookies();
            const now = Date.now();
            
            // Cập nhật timestamps
            const refreshedCookies = cookies.map(cookie => ({
                ...cookie,
                creation: now,
                lastAccessed: now
            }));

            await fs.writeJson(this.cookiePath, refreshedCookies, { spaces: 2 });
            await this.sleep(3000);
            
        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Lỗi khi refresh cookies');
            }
            throw error;
        }
    }

    /**
     * Utility: Sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Lấy User ID từ cookie c_user
     */
    getUserIdFromCookies(cookies) {
        const cUserCookie = cookies.find(c => c.key === 'c_user');
        return cUserCookie ? cUserCookie.value : null;
    }

    /**
     * Kiểm tra cookie có hết hạn không
     */
    isExpired(cookies) {
        try {
            const xsCookie = cookies.find(c => c.key === 'xs');
            if (!xsCookie) return true;

            // Giải mã phần timestamp từ xs cookie
            const xsValue = decodeURIComponent(xsCookie.value);
            const timestampMatch = xsValue.match(/:(\d+):/);
            
            if (timestampMatch) {
                const timestamp = parseInt(timestampMatch[1]);
                const now = Math.floor(Date.now() / 1000);
                
                // Nếu timestamp cách hiện tại quá 30 ngày thì coi như hết hạn
                return (now - timestamp) > (30 * 24 * 60 * 60);
            }
            
            return false;
        } catch (error) {
            return true; // Nếu không parse được thì coi như hết hạn
        }
    }
}

module.exports = CookieAuth;
