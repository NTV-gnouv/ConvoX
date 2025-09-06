// Load environment variables first
require('dotenv').config();

const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');
const BotManager = require('./core/BotManager');
const Logger = require('./core/Logger');

// Initialize logger
const logger = new Logger();

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
    logger.logError(error, 'Uncaught Exception');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.logError(reason, 'Unhandled Rejection');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.system('Received SIGINT. Shutting down gracefully...');
    if (global.botManager) {
        await global.botManager.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.system('Received SIGTERM. Shutting down gracefully...');
    if (global.botManager) {
        await global.botManager.stop();
    }
    process.exit(0);
});

// Main function
async function main() {
    try {
        logger.system('Initializing ConvoX Bot...');
        
        // Create bot manager
        const botManager = new BotManager();
        global.botManager = botManager;
        
        // Initialize bot
        const initialized = await botManager.initialize();
        if (!initialized) {
            logger.logError(error, 'Failed to initialize bot');
            process.exit(1);
        }
        
        // Start bot
        await botManager.start();
        
        logger.success('ConvoX Bot is running successfully!');
        logger.info('Press Ctrl+C to stop the bot');
        
        // Keep the process alive
        setInterval(() => {
            // Heartbeat to keep process alive
        }, 1000);
        
    } catch (error) {
        logger.logError(error, 'Failed to start ConvoX Bot');
        process.exit(1);
    }
}

// Start the bot
main();
