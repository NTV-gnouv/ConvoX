class PingPlugin {
    constructor(api, config, authManager) {
        this.api = api;
        this.config = config;
        this.authManager = authManager;
        this.name = 'Ping Plugin';
        this.version = '1.0.0';
    }

    async initialize() {
        console.log('🏓 Ping Plugin initialized');
    }

    registerCommands(commandHandler) {
        commandHandler.registerCommand('ping', this.handlePingCommand.bind(this), {
            description: 'Kiểm tra độ trễ của bot',
            usage: '!ping',
            example: '!ping',
            category: 'utility',
            cooldown: 2,
            aliases: ['pong', 'latency']
        });
    }

    async cleanup() {
        console.log('🏓 Ping Plugin cleaned up');
    }

    async handlePingCommand(event, args) {
        try {
            const { threadID } = event;
            const startTime = Date.now();
            
            // Send initial message
            const message = await this.api.sendMessage('🏓 Pong!', threadID);
            
            // Calculate latency
            const latency = Date.now() - startTime;
            
            // Edit message with latency info
            const latencyText = `🏓 **Pong!**\n\n📊 **Thông tin:**\n• Latency: ${latency}ms\n• Status: ${latency < 100 ? '🟢 Tốt' : latency < 300 ? '🟡 Bình thường' : '🔴 Chậm'}`;
            
            await this.api.sendMessage(latencyText, threadID);
            
        } catch (error) {
            console.error('❌ Error in ping command:', error);
            await this.api.sendMessage('❌ Lỗi khi kiểm tra ping!', event.threadID);
        }
    }

    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: 'Checks bot latency and response time'
        };
    }
}

module.exports = PingPlugin;
