// Load environment variables first (quiet)
try { require('dotenv').config({ quiet: true }); } catch {}

// Hide npm run header (e.g., "> package@1.0.0 start" and the command echo)
// Only when started via npm and in a TTY console; uses ANSI to clear previous 2 lines
(function eraseNpmHeader() {
    try {
        const isNpm = !!(process.env.npm_lifecycle_event || process.env.npm_execpath || (process.env.npm_config_user_agent || '').includes('npm'));
        if (!isNpm || !process.stdout.isTTY) return;
        // Move cursor up 2 lines, clear each, then position at start of line
        // Up 2 lines
        process.stdout.write('\u001b[2A');
        // Clear current line
        process.stdout.write('\u001b[2K');
        // Move down 1 and clear again
        process.stdout.write('\u001b[1B');
        process.stdout.write('\u001b[2K');
        // Ensure cursor at column 1
        process.stdout.write('\r');
    } catch {}
})();

const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');
const BotManager = require('./core/BotManager');
const Logger = require('./core/Logger');
const fs = require('fs-extra');

// Load config early to control logging/compact mode
let earlyConfig = { logging: {}, bot: {} };
try {
    const botConfig = fs.readJsonSync('./config/bot.json');
    earlyConfig.logging = botConfig.logging || {};
    earlyConfig.bot = botConfig.bot || botConfig || {};
} catch {}

// Initialize logger with config
const logger = new Logger(earlyConfig.logging);

// Compact mode flag from config or env
const COMPACT = (earlyConfig.logging && earlyConfig.logging.compact === true) || process.env.COMPACT_LOG === '1';
if (COMPACT) {
    // Suppress non-error logs for compact startup
    logger.updateConfig({ level: 'error', enableColors: false });
}

// Always show banner and credits (even in compact mode)
const banner = figlet.textSync('ConvoX Bot', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default'
});
console.log(gradient.rainbow(banner));
const BOT_NAME = process.env.BOT_NAME || earlyConfig.bot.name || 'ConvoX';
const BOT_VERSION = process.env.BOT_VERSION || earlyConfig.bot.version || '1.0.0';
const BOT_DESCRIPTION = process.env.BOT_DESCRIPTION || earlyConfig.bot.description || 'chatbot thế hệ mới';
const BOT_AUTHOR = process.env.BOT_AUTHOR || earlyConfig.bot.author || 'Thanh Vương';
const SHOW_CREDIT = (process.env.CONVOX_SHOW_CREDIT ?? '1') !== '0';
console.log(chalk.cyan(`🚀 ${BOT_NAME} ${BOT_DESCRIPTION} v${BOT_VERSION}`));
if (SHOW_CREDIT) {
    console.log(chalk.gray(`👨‍💻 Created by: ${BOT_AUTHOR}`));
    console.log(chalk.gray('📱 Made with fca-unofficial library'));
    console.log(chalk.gray('🔗 GitHub: https://github.com/ConvoXTeam/ConvoXBot'));
}

// Error handling được xử lý bởi AutoRestart system
// process.on('uncaughtException', (error) => {
//     logger.logError(error, 'Uncaught Exception');
//     process.exit(1);
// });

// process.on('unhandledRejection', (reason, promise) => {
//     logger.logError(reason, 'Unhandled Rejection');
// });

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
        if (!COMPACT) logger.system('Initializing ConvoX Bot...');
        
        // After banner: tighten compact filtering on stderr and console methods too
        if (COMPACT) {
            const stripAnsi = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');
            const allowPatterns = [/ConvoX v.*ready/i, /ConvoX ready/i];
            const noisyPatterns = [
                /\[\s*FCA[^\]]*\]/i,
                /dotenv@.*injecting env/i
            ];
            const shouldSuppress = (str) => noisyPatterns.some(p => p.test(str)) && !allowPatterns.some(p => p.test(str));

            const patchWrite = (stream) => {
                const orig = stream.write;
                let buf = '';
                stream.write = function(...args) {
                    try {
                        const first = args[0];
                        const s = Buffer.isBuffer(first) ? first.toString('utf8') : String(first);
                        buf += s;
                        if (buf.includes('\n')) {
                            const parts = buf.split(/\r?\n/);
                            buf = parts.pop();
                            const kept = parts.filter(line => {
                                const clean = stripAnsi(line);
                                return !shouldSuppress(clean);
                            }).join('\n');
                            if (kept.length > 0) {
                                return orig.call(stream, kept + '\n', ...args.slice(1));
                            }
                            return true;
                        }
                        return true;
                    } catch {}
                    return orig.apply(stream, args);
                };
            };
            patchWrite(process.stdout);
            patchWrite(process.stderr);

            const filteredConsole = (orig) => (...args) => {
                try {
                    const s = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
                    if (shouldSuppress(s)) return;
                } catch {}
                return orig(...args);
            };
            console.log = filteredConsole(console.log.bind(console));
            console.info = filteredConsole(console.info.bind(console));
            console.warn = filteredConsole(console.warn.bind(console));
            console.error = filteredConsole(console.error.bind(console));
        }

    // Create bot manager with shared logger
    const botManager = new BotManager(logger);
        global.botManager = botManager;
        
        // Initialize bot
        const initialized = await botManager.initialize();
        if (!initialized) {
            logger.logError(new Error('Bot initialization failed'), 'Failed to initialize bot');
            process.exit(1);
        }
        
        // Start bot
        await botManager.start();
        
        if (!COMPACT) {
            // No extra startup logs in verbose mode to keep console clean
        } else {
            // One-line compact summary
            try {
                const status = global.botManager.getStatus();
                const id = global.botManager.api?.getCurrentUserID?.() || 'unknown';
                const name = process.env.BOT_NAME || global.botManager.config?.bot?.name || 'ConvoX';
                const ver = process.env.BOT_VERSION || global.botManager.config?.bot?.version || '1.0.0';
                const plugins = status.plugins ?? 'n/a';
                const commands = status.commands ?? 'n/a';
                const summary = `✅ ${name} v${ver} ready | Login successful! | uid:${id} | plugins:${plugins} | commands:${commands}`;
                const gradients = [
                    gradient.rainbow,
                    gradient.vice,
                    gradient.retro,
                    gradient.pastel,
                    gradient.morning,
                    gradient.atlas,
                    gradient.cristal,
                    gradient.teen,
                    gradient.instagram,
                    gradient.summer
                ].filter(Boolean);
                const pick = () => gradients[Math.floor(Math.random() * gradients.length)] || gradient.rainbow;
                console.log(pick()(summary));
            } catch {
                console.log('✅ ConvoX ready');
            }
        }
        
    // Keep the process alive (no noisy heartbeat logs)
    setInterval(() => {}, 1000);
        
    } catch (error) {
        logger.logError(error, 'Failed to start ConvoX Bot');
        process.exit(1);
    }
}

// Start the bot
main();
