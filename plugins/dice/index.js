class DicePlugin {
    constructor(api, config) {
        this.api = api;
        this.config = config;
        this.name = 'Dice Plugin';
        this.version = '1.0.0';
    }

    async initialize() {
        console.log('🎲 Dice Plugin initialized');
    }

    async cleanup() {
        console.log('🎲 Dice Plugin cleaned up');
    }

    async handleDiceCommand(event, args) {
        try {
            const { threadID } = event;
            
            // Parse arguments for custom dice
            let sides = 6;
            let count = 1;
            
            if (args.length > 0) {
                const input = args[0];
                if (input.includes('d')) {
                    // Format: XdY (count d sides)
                    const parts = input.split('d');
                    count = parseInt(parts[0]) || 1;
                    sides = parseInt(parts[1]) || 6;
                } else {
                    sides = parseInt(input) || 6;
                }
            }
            
            // Limit values
            count = Math.min(Math.max(count, 1), 10);
            sides = Math.min(Math.max(sides, 2), 100);
            
            // Roll dice
            const results = [];
            let total = 0;
            
            for (let i = 0; i < count; i++) {
                const roll = Math.floor(Math.random() * sides) + 1;
                results.push(roll);
                total += roll;
            }
            
            // Format result
            let resultText = `🎲 **Kết quả gieo xúc xắc:**\n\n`;
            
            if (count === 1) {
                resultText += `🎯 **Kết quả:** ${results[0]}\n`;
                resultText += `📊 **Xúc xắc:** ${sides} mặt\n`;
            } else {
                resultText += `🎯 **Kết quả:** ${results.join(', ')}\n`;
                resultText += `📊 **Tổng:** ${total}\n`;
                resultText += `🎲 **Xúc xắc:** ${count}x${sides} mặt\n`;
            }
            
            // Add some fun messages
            const funMessages = [
                '🍀 Chúc may mắn!',
                '✨ Thần may mắn đang mỉm cười!',
                '🌟 Kết quả tuyệt vời!',
                '🎉 Tuyệt vời!',
                '🔥 Quá đỉnh!'
            ];
            
            const randomMessage = funMessages[Math.floor(Math.random() * funMessages.length)];
            resultText += `\n${randomMessage}`;
            
            await this.api.sendMessage(resultText, threadID);
            
        } catch (error) {
            console.error('❌ Error in dice command:', error);
            await this.api.sendMessage('❌ Lỗi khi gieo xúc xắc!', event.threadID);
        }
    }

    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: 'Rolls dice with customizable sides and count'
        };
    }
}

module.exports = DicePlugin;
