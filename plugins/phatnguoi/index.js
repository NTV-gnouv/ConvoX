'use strict';

const axios = require('axios');

class PhatNguoiPlugin {
    constructor(api, config, authManager, logger) {
        this.api = api;
        this.authManager = authManager;
        this.logger = logger;
        this.name = 'PhatNguoiVN';
        this.version = '1.0.0';
        this.isInitialized = false;

        // Cấu hình mặc định
        this.config = {
            enabled: true,
            cooldown: 8,
            // Danh sách provider thử tra cứu (tùy chọn, có thể để rỗng). Mỗi provider là 1 hàm async (plate, frameLast6) => { found, data, source }.
            providers: [],
            // Timeout cho mỗi provider (ms)
            providerTimeoutMs: 10000,
            // Trả kèm link hướng dẫn chính thống nếu không có kết quả
            includeOfficialLinks: true,
            // Chỉ trả về dòng kết quả ngắn gọn (mặc định: true)
            compactOutput: true,
            ...config
        };
    }

    async initialize() {
        this.isInitialized = true;
        this.logger && this.logger.info('[PhatNguoi] Plugin initialized');
    }

    // Helper: set reaction safely with timeout (avoid hanging if callback not fired)
    async setReactionSafe(reaction, messageID, timeoutMs = 8000) {
        if (!messageID) return false;
        try {
            await new Promise((resolve) => {
                let done = false;
                const t = setTimeout(() => { if (!done) { done = true; resolve(false); } }, timeoutMs);
                try {
                    this.api.setMessageReaction(reaction, messageID, () => {
                        if (done) return; done = true; clearTimeout(t); resolve(true);
                    });
                } catch (_) {
                    if (done) return; done = true; clearTimeout(t); resolve(false);
                }
            });
            return true;
        } catch (_) {
            return false;
        }
    }

    registerCommands(commandHandler) {
        commandHandler.registerCommand('phatnguoi', this.handleLookup.bind(this), {
            description: 'Tra cứu phạt nguội xe Việt Nam theo biển số',
            usage: '!phatnguoi <biển_số> [6_số_khung]',
            example: '!phatnguoi 30A-123.45 | !phatnguoi 51F12345 ABC123',
            category: 'utility',
            cooldown: this.config.cooldown,
            adminOnly: false
        });
    }

    // === Command handler ===
    async handleLookup(event, args = []) {
        const { threadID, messageID } = event;

        if (!args.length) {
            await this.api.sendMessage(this.helpText(), threadID);
            return;
        }

        const rawPlate = args[0];
        const frame6 = (args[1] || '').trim();
        const norm = this.normalizePlate(rawPlate);

        if (!norm.valid) {
            await this.api.sendMessage(
                '❌ Biển số không hợp lệ. Ví dụ: 30A-123.45, 51F-12345, 43C-123.45\n' +
                'Gợi ý: dùng định dạng 2-3 ký tự đầu + số (có thể có dấu \"-\" hoặc \".\").',
                threadID
            );
            return;
        }

    // Thả icon đồng hồ cát vào tin nhắn lệnh (không để treo)
    await this.setReactionSafe('⌛', messageID, 5000);

        try {
            const result = await this.queryProvidersWithTimeout(norm.compact, frame6);

            if (result && result.found) {
                const msg = this.formatFound(result, norm.display);
        await this.api.sendMessage(msg, threadID);
                // Đổi sang tích xanh
                await this.setReactionSafe('✅', messageID, 5000);
                return;
            }

            // Không có kết quả hoặc provider không khả dụng
            if (this.config.compactOutput !== false) {
                // Chế độ gọn: chỉ một dòng kết quả
                await this.api.sendMessage(`✅ Kết quả: Chưa ghi nhận phạt nguội (bạn có thể tra cứu kĩ hơn trên nguồn chính BCA) : ${norm.display}`, threadID);
            } else {
                // Chế độ chi tiết: kèm liên kết & mẹo
                const links = this.buildOfficialLinks(norm.compact);
                const tips = this.buildTips(frame6);
                const text = [
                    `✅ Kết quả: Chưa ghi nhận phạt nguội (bạn có thể tra cứu kĩ hơn trên nguồn chính BCA) : ${norm.display}`,
                    '',
                    'Bạn có thể tự tra cứu theo các cổng chính thống:',
                    ...links,
                    '',
                    ...tips
                ].join('\n');
                await this.api.sendMessage(text, threadID);
            }
            // Đổi sang tích xanh
            await this.setReactionSafe('✅', messageID, 5000);
        } catch (err) {
            this.logger && this.logger.logError(err, '[PhatNguoi] lookup failed');
            if (this.config.compactOutput !== false) {
                await this.api.sendMessage('⚠️ Không thể tra cứu tự động lúc này. Vui lòng thử lại sau.', threadID);
            } else {
                const links = this.buildOfficialLinks(norm.compact);
                await this.api.sendMessage(
                    '⚠️ Không thể tra cứu tự động lúc này. Vui lòng thử lại sau hoặc dùng các cổng dưới đây:\n' +
                    links.join('\n'),
                    threadID
                );
            }
            // Đổi sang dấu X khi lỗi
            await this.setReactionSafe('❌', messageID, 5000);
        }
    }

    helpText() {
        return (
            'Cách dùng: !phatnguoi <biển_số> [6_số_khung]\n' +
            'Ví dụ: !phatnguoi 30A-123.45 | !phatnguoi 51F12345 ABC123\n' +
            'Gợi ý: Thêm 6 số cuối số khung (nếu biết) để tăng khả năng tra cứu ở một số cổng.'
        );
    }

    // === Providers orchestration ===
    async queryProvidersWithTimeout(plateCompact, frameLast6) {
        const providers = Array.isArray(this.config.providers) ? this.config.providers : [];
        if (!providers.length) return null; // link-only mode

        for (const provider of providers) {
            try {
                const res = await this.runWithTimeout(provider(plateCompact, frameLast6), this.config.providerTimeoutMs);
                if (res && res.found) return res;
            } catch (e) {
                // tiếp tục thử provider tiếp theo
            }
        }
        return null;
    }

    async runWithTimeout(promise, ms = 10000) {
        let t;
        return await Promise.race([
            promise,
            new Promise((_, rej) => t = setTimeout(() => rej(new Error('timeout')), ms))
        ]).finally(() => t && clearTimeout(t));
    }

    // === Formatting ===
    formatFound(result, displayPlate) {
        const lines = [`🚨 Có thể có phạt nguội cho: ${displayPlate}`];
        if (result.source) lines.push(`Nguồn: ${result.source}`);

        const items = Array.isArray(result.data) ? result.data : [];
        if (!items.length) return lines.concat(['(Không có chi tiết trả về)']).join('\n');

        items.slice(0, 5).forEach((it, idx) => {
            const place = it.place || it.location || 'Không rõ địa điểm';
            const time = it.time || it.date || it.violationTime || 'Không rõ thời gian';
            const law = it.law || it.violation || it.content || 'Hành vi vi phạm không rõ';
            const plate = it.plate || displayPlate;
            const status = it.status || it.state || 'Chưa xử lý/Không rõ';
            lines.push(`• #${idx + 1} | ${time} | ${place}`);
            lines.push(`  - Biển: ${plate}`);
            lines.push(`  - Lỗi: ${law}`);
            lines.push(`  - Trạng thái: ${status}`);
            if (it.document || it.ticket || it.decision) {
                lines.push(`  - Quyết định/biên bản: ${it.document || it.ticket || it.decision}`);
            }
        });

        if (items.length > 5) lines.push(`... và ${items.length - 5} kết quả khác`);
        lines.push('', 'Khuyến nghị: Vui lòng xác minh lại trên cổng chính thống trước khi nộp phạt.');
        return lines.join('\n');
    }

    // === Utilities ===
    normalizePlate(input = '') {
        const s = (input || '').toUpperCase().trim();
        // Loại bỏ ký tự không phải chữ/số
        const alnum = s.replace(/[^A-Z0-9]/g, '');
        // Mẫu chung VN: NN[L|LL|LLL]DDDD[DD]
        const m = alnum.match(/^(\d{2,3}[A-Z]{1,3})(\d{4,6})$/);
        if (!m) {
            // Không khớp mẫu phổ biến => invalid
            return { valid: false, compact: alnum, display: s };
        }
        const prefix = m[1];
        const number = m[2];
        // Dạng hiển thị: prefix-xxx.xx (5) | prefix-xxxx (4) | prefix-xxx.xxx (6)
        let tail;
        if (number.length === 5) tail = `${number.slice(0, 3)}.${number.slice(3)}`;
        else if (number.length === 6) tail = `${number.slice(0, 3)}.${number.slice(3)}`;
        else tail = number; // 4
        const display = `${prefix}-${tail}`;
        return { valid: true, compact: `${prefix}${number}`, display };
    }

    buildOfficialLinks(plateCompact) {
        const links = [];
        // Cục CSGT (trang thông tin, có thể yêu cầu captcha/đăng nhập ở các bước tiếp):
        links.push('• Cục CSGT: https://www.csgt.vn/ (mục Tra cứu/Thông tin xử phạt)');
        // Cổng DVC Quốc gia (Bộ Công an): đường dẫn thay đổi theo thời gian, để trang chủ DVC
        links.push('• Cổng Dịch vụ công Bộ Công an: https://dichvucong.bocongan.gov.vn/');
        // Một số địa phương thường dùng (tham khảo, có thể thay đổi):
        links.push('• Hà Nội: https://congdan.hanoi.gov.vn/tra-cuu-xu-phat-nguoi-vi-pham-giao-thong');
        links.push('• TP.HCM (tham khảo): https://thongtinkhachsatgt.hochiminhcity.gov.vn/ hoặc cổng DVC địa phương');
        // Đăng kiểm (không phải phạt nguội, nhưng tra cứu thông tin xe):
        links.push('• Đăng kiểm (thông tin phương tiện): https://app.vr.org.vn/ptpublic/#!/home');
        return links;
    }

    buildTips(frame6) {
        const tips = [
            'Mẹo tra cứu:',
            '- Chuẩn hóa biển số (bỏ dấu chấm/cách). Ví dụ: 30A12345, 51F12345.',
            '- Một số cổng yêu cầu 6 số cuối số khung (VIN) để xác thực.',
            '- Kết quả trên Internet chỉ mang tính tham khảo. Vui lòng xác nhận tại cơ quan có thẩm quyền.'
        ];
        if (frame6) tips.push(`- Bạn đã cung cấp 6 số khung: ${frame6}`);
        return tips;
    }

    async cleanup() {
        this.logger && this.logger.info('[PhatNguoi] Plugin cleaned up');
    }

    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: 'Tra cứu phạt nguội (best‑effort) + liên kết chính thống',
            credits: 'ConvoX Team'
        };
    }
}

module.exports = PhatNguoiPlugin;
