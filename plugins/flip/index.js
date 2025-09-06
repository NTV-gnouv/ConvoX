class FlipPlugin {
    constructor(api, config) {
        this.api = api;
        this.config = config;
        this.name = 'Flip Plugin';
        this.version = '1.0.0';
    }

    async initialize() {
        console.log('🪙 Flip Plugin initialized');
    }

    async cleanup() {
        console.log('🪙 Flip Plugin cleaned up');
    }

    async handleFlipCommand(event, args) {
        try {
            const { threadID } = event;
            
            // Flip coin
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const emoji = result === 'heads' ? '🟡' : '⚫';
            const vietnamese = result === 'heads' ? 'Mặt ngửa' : 'Mặt sấp';
            
            // Add some fun animations
            const animation = ['🪙', '🔄', '⚡', '✨'];
            let animationText = '';
            
            for (let i = 0; i < 3; i++) {
                const randomEmoji = animation[Math.floor(Math.random() * animation.length)];
                animationText += randomEmoji + ' ';
            }
            
            const resultText = `
${animationText}

${emoji} **Kết quả:** ${vietnamese} (${result.toUpperCase()})

🎲 **Thống kê:**
• Xác suất: 50/50
• Kết quả: ${result === 'heads' ? 'Ngửa' : 'Sấp'}
• Thời gian: ${new Date().toLocaleTimeString('vi-VN')}

${result === 'heads' ? '🍀 Chúc may mắn!' : '💪 Thử lại lần sau!'}
            `;
            
            await this.api.sendMessage(resultText, threadID);
            
        } catch (error) {
            console.error('❌ Error in flip command:', error);
            await this.api.sendMessage('❌ Lỗi khi tung đồng xu!', event.threadID);
        }
    }

    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: 'Flips a coin with fun animations'
        };
    }
}

module.exports = FlipPlugin;
