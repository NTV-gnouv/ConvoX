class HelpPlugin {
    constructor(api, config, authManager) {
        this.api = api;
        this.config = config;
        this.authManager = authManager;
        this.name = 'Help Plugin';
        this.version = '1.0.0';
    }

    async initialize() {
        // Plugin initialized silently
    }

    registerCommands(commandHandler) {
        // Lệnh help - dành cho tất cả người dùng được phép
        commandHandler.registerCommand('help', this.handleHelpCommand.bind(this), {
            description: 'Hiển thị hướng dẫn sử dụng bot',
            usage: '!help',
            example: '!help',
            category: 'general',
            cooldown: 5,
            aliases: ['h', 'guide', 'hướng dẫn']
        });
    }

    async cleanup() {
        // Plugin cleaned up silently
    }

    async handleHelpCommand(event, args) {
        try {
            const { threadID } = event;
            
            const helpText = `
🆘 **HƯỚNG DẪN SỬ DỤNG CONVOX BOT**

👨‍💻 **Tác giả:** Thanh Vương  
🏗️ **Dự án:** ConvoX chatbot thế hệ mới

📖 **Cách sử dụng:**
• Gõ \`${this.config.bot.prefix}menu\` để xem menu chính
• Chọn số thứ tự category để xem lệnh (VD: 1, 2, 3...)
• Gõ lệnh với prefix \`${this.config.bot.prefix}\` (VD: \`${this.config.bot.prefix}ping\`)

🎯 **Lệnh cơ bản:**
• \`${this.config.bot.prefix}menu\` - Hiển thị menu chính
• \`${this.config.bot.prefix}help\` - Hiển thị hướng dẫn này
• \`${this.config.bot.prefix}info\` - Thông tin bot
• \`${this.config.bot.prefix}ping\` - Kiểm tra ping

🎮 **Lệnh giải trí:**
• \`${this.config.bot.prefix}dice\` - Gieo xúc xắc
• \`${this.config.bot.prefix}flip\` - Tung đồng xu
• \`${this.config.bot.prefix}joke\` - Kể chuyện cười

❓ **Cần hỗ trợ?**
Liên hệ admin để được hỗ trợ thêm!
            `;
            
            await this.api.sendMessage(helpText, threadID);
            
        } catch (error) {
            console.log('⚠️ Help command error:', error.message || 'Unknown error');
            try {
                await this.api.sendMessage('❌ Không thể hiển thị hướng dẫn. Vui lòng thử lại sau!', event.threadID);
            } catch (fallbackError) {
                console.log('⚠️ Fallback help message also failed');
            }
        }
    }

    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: 'Provides help and guidance for bot usage'
        };
    }
}

module.exports = HelpPlugin;
