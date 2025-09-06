// Load environment variables first
require('dotenv').config();

const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');
const BotManager = require('./core/BotManager');

// Banner
const banner = figlet.textSync('ConvoX Bot', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default'
});

console.log(gradient.rainbow(banner));
console.log(chalk.cyan('🚀 ConvoX chatbot thế hệ mới v1.0.0'));
console.log(chalk.gray('👨‍💻 Created by: Thanh Vương'));
console.log(chalk.gray('📱 Made with fca-unofficial library'));
console.log(chalk.gray('🔗 GitHub: https://github.com/ConvoXTeam/ConvoXBot'));
console.log('');

// Error handling
process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:'), error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🛑 Received SIGINT. Shutting down gracefully...'));
    if (global.botManager) {
        await global.botManager.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n🛑 Received SIGTERM. Shutting down gracefully...'));
    if (global.botManager) {
        await global.botManager.stop();
    }
    process.exit(0);
});

// Main function
async function main() {
    try {
        console.log(chalk.blue('🔧 Initializing ConvoX Bot...'));
        
        // Create bot manager
        const botManager = new BotManager();
        global.botManager = botManager;
        
        // Initialize bot
        const initialized = await botManager.initialize();
        if (!initialized) {
            console.error(chalk.red('❌ Failed to initialize bot'));
            process.exit(1);
        }
        
        // Start bot
        await botManager.start();
        
        console.log(chalk.green('✅ ConvoX Bot is running successfully!'));
        console.log(chalk.gray('💡 Press Ctrl+C to stop the bot'));
        
        // Keep the process alive
        setInterval(() => {
            // Heartbeat to keep process alive
        }, 1000);
        
    } catch (error) {
        console.error(chalk.red('❌ Failed to start ConvoX Bot:'), error);
        process.exit(1);
    }
}

// Start the bot
main();
