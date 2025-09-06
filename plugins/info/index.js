class InfoPlugin {
    constructor(api, config) {
        this.api = api;
        this.config = config;
        this.name = 'Info Plugin';
        this.version = '1.0.0';
        this.startTime = Date.now();
    }

    async initialize() {
        // Plugin initialized silently
    }

    async cleanup() {
        // Plugin cleaned up silently
    }

    async handleInfoCommand(event, args) {
        try {
            const { threadID } = event;
            const uptime = this.getUptime();
            
            const infoText = `
🤖 **THÔNG TIN CONVOX BOT**

📛 **Tên:** ${this.config.bot?.name || 'ConvoX chatbot thế hệ mới'}
🔢 **Phiên bản:** ${this.config.bot?.version || '1.0.0'}
👨‍💻 **Tác giả:** Thanh Vương
🏗️ **Dự án:** ConvoX chatbot thế hệ mới
⏰ **Thời gian hoạt động:** ${uptime}
🔧 **Prefix:** ${this.config.bot?.prefix || '!'}
👥 **Admin:** ${this.config.bot?.admin?.length || 0} người

📊 **Thống kê:**
• Tổng số lệnh: ${this.getTotalCommands()}
• Số categories: ${this.getCategoryCount()}
• Plugins đã load: ${this.getPluginCount()}

💡 **Hỗ trợ:** Gõ \`${this.config.bot?.prefix || '!'}help\` để xem hướng dẫn
            `;
            
            await this.api.sendMessage(infoText, threadID);
        } catch (error) {
            console.error('❌ Error in info command:', error);
        }
    }

    getUptime() {
        const uptimeMs = Date.now() - this.startTime;
        const seconds = Math.floor(uptimeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} ngày, ${hours % 24} giờ, ${minutes % 60} phút`;
        } else if (hours > 0) {
            return `${hours} giờ, ${minutes % 60} phút`;
        } else if (minutes > 0) {
            return `${minutes} phút, ${seconds % 60} giây`;
        } else {
            return `${seconds} giây`;
        }
    }

    getTotalCommands() {
        // This would be injected by the core system
        return 25; // Placeholder
    }

    getCategoryCount() {
        return 5; // Placeholder
    }

    getPluginCount() {
        return 12; // Placeholder
    }

    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: 'Displays bot information and statistics'
        };
    }
}

module.exports = InfoPlugin;
