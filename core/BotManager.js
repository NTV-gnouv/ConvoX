const fs = require('fs-extra');
const path = require('path');
const Logger = require('./Logger');
const AutoRestart = require('./AutoRestart');
const gradient = require('gradient-string');

class BotManager {
    constructor(logger = null) {
        this.api = null;
        this.config = null;
        this.commandHandler = null;
        this.pluginManager = null;
        this.menuSystem = null;
        this.authManager = null;
        this.autoRestart = null;
        this.isRunning = false;
        this.startTime = Date.now();
        this.logger = logger;
    }

    async initialize() {
        try {
            // Load configuration first
            await this.loadConfig();

            // Initialize logger after config is loaded (use injected if provided)
            this.logger = this.logger || new Logger(this.config.logging || {});

            // Initialize auto restart system if enabled
            if (this.config.features && this.config.features.autoRestart !== false) {
                this.autoRestart = new AutoRestart(this.logger);
                this.autoRestart.setupAutoRestart();
            }

            const COMPACT = (this.config.logging && this.config.logging.compact === true) || process.env.COMPACT_LOG === '1';
            if (!COMPACT) {
                if (this.logger) this.logger.system('Initializing ConvoX Bot...');
                else console.log('🚀 Initializing ConvoX Bot...');
            }

            // Initialize Facebook API
            await this.initializeFacebook();

            // Initialize core systems
            await this.initializeCoreSystems();

            if (!COMPACT) {
                if (this.logger) this.logger.success('Bot initialized successfully!');
                else console.log('✅ Bot initialized successfully!');
            }
            return true;
        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Failed to initialize bot');
            } else {
                console.error('❌ Failed to initialize bot:', error);
            }

            // Try auto restart on initialization error
            if (this.autoRestart && this.autoRestart.shouldRestart(error)) {
                await this.autoRestart.restart(`Initialization Error: ${error.message}`);
                return false;
            }

            return false;
        }
    }

    async loadConfig() {
        try {
            const pluginsConfig = await fs.readJson('./config/plugins.json');
            const botConfig = await fs.readJson('./config/bot.json');

            this.config = {
                bot: botConfig.bot || botConfig,
                facebook: botConfig.facebook || {},
                features: botConfig.features || {},
                logging: botConfig.logging || {},
                commands: await fs.readJson('./config/commands.json'),
                plugins: pluginsConfig.plugins || pluginsConfig
            };
            const COMPACT = (this.config?.logging && this.config.logging.compact === true) || process.env.COMPACT_LOG === '1';
            if (!COMPACT) {
                if (this.logger) this.logger.info('Configuration loaded');
                else console.log('📋 Configuration loaded');
            }
        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Failed to load configuration');
            } else {
                console.error('❌ Failed to load configuration:', error);
            }
            throw error;
        }
    }

    async initializeFacebook() {
        try {
            const fca = require('@dongdev/fca-unofficial');
            const CookieAuth = require('./CookieAuth');

            // Khởi tạo CookieAuth
            this.cookieAuth = new CookieAuth(this.logger);

            // Ưu tiên sử dụng cookie nếu có
            let appState;
            const cookiePath = this.config.facebook.cookies || './cookies.json';
            const fbstatePath = this.config.facebook.fbstate || this.config.facebook.appstate || './fbstate.json';

            if (await fs.pathExists(cookiePath)) {
                // Sử dụng cookie
                if (this.logger) {
                    this.logger.info('🍪 Đang sử dụng cookie để đăng nhập...');
                }
                
                const cookies = await this.cookieAuth.loadCookies();
                this.cookieAuth.validateCookies(cookies);
                
                // Kiểm tra cookie có hết hạn không
                if (this.cookieAuth.isExpired(cookies)) {
                    if (this.logger) {
                        this.logger.warn('⚠️ Cookie có vẻ đã hết hạn, nhưng vẫn thử đăng nhập...');
                    }
                }
                
                appState = this.cookieAuth.convertCookiesToAppState(cookies);
                
                if (this.logger) {
                    const userId = this.cookieAuth.getUserIdFromCookies(cookies);
                    this.logger.info(`📱 User ID từ cookie: ${userId}`);
                }
            } else if (await fs.pathExists(fbstatePath)) {
                // Fallback to fbstate
                if (this.logger) {
                    this.logger.warn('⚠️ Không tìm thấy cookie, sử dụng fbstate cũ...');
                }
                
                const rawState = await fs.readJson(fbstatePath);
                appState = rawState.fbstate || rawState.fbState || rawState.fbAppState || rawState.appState || rawState;
                
                if (!Array.isArray(appState)) {
                    throw new Error('Invalid fbstate format. Expected an array.');
                }
            } else {
                throw new Error('Không tìm thấy file cookie.json hoặc fbstate.json');
            }

            // Hàm đăng nhập với retry logic
            const loginWithRetry = async (retryCount = 0) => {
                return new Promise((resolve, reject) => {
                    const options = {
                        listenEvents: this.config.facebook.listenEvents,
                        listenTyping: this.config.facebook.listenTyping,
                        selfListen: this.config.facebook.selfListen,
                        forceLogin: this.config.facebook.forceLogin,
                        logLevel: this.config.facebook.logLevel,
                        userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    };

                    fca({ appState }, options, async (err, api) => {
                        if (err) {
                            if (this.logger) {
                                this.logger.logError(err, `Facebook login error (attempt ${retryCount + 1})`);
                            }

                            // Thử vượt checkpoint
                            if (this.cookieAuth && retryCount < 3) {
                                const handled = await this.cookieAuth.handleCheckpoint(err, async () => {
                                    try {
                                        return await loginWithRetry(retryCount + 1);
                                    } catch (retryErr) {
                                        return false;
                                    }
                                });

                                if (handled) {
                                    return; // Checkpoint đã được xử lý, sẽ có kết quả từ retry
                                }
                            }

                            // Try auto restart on Facebook error
                            if (this.autoRestart && this.autoRestart.shouldRestart(err)) {
                                await this.autoRestart.handleFacebookError(err);
                                return; // Will restart, no need to reject
                            }

                            reject(err);
                        } else {
                            // Backup appState mới
                            if (this.cookieAuth && api.getAppState) {
                                try {
                                    const newAppState = api.getAppState();
                                    await this.cookieAuth.saveAppStateAsCookie(newAppState);
                                } catch (backupErr) {
                                    if (this.logger) {
                                        this.logger.warn('Không thể backup appState mới:', backupErr.message);
                                    }
                                }
                            }

                            const COMPACT = (this.config.logging && this.config.logging.compact === true) || process.env.COMPACT_LOG === '1';
                            if (!COMPACT) {
                                if (this.logger) this.logger.api('connected successfully');
                                else console.log('🔗 Facebook API connected successfully');
                            }
                            resolve(api);
                        }
                    });
                });
            };

            // Thực hiện đăng nhập với retry
            this.api = await loginWithRetry();

        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Failed to connect to Facebook');
            } else {
                console.error('❌ Failed to connect to Facebook:', error);
            }

            // Try auto restart on Facebook connection error
            if (this.autoRestart && this.autoRestart.shouldRestart(error)) {
                await this.autoRestart.handleFacebookError(error);
                return; // Will restart
            }

            throw error;
        }
    }

    async initializeCoreSystems() {
        try {
            // Initialize Auth Manager first
            const AuthManager = require('./AuthManager');
            this.authManager = new AuthManager(this.logger);

            // Initialize Command Handler
            const CommandHandler = require('./CommandHandler');
            this.commandHandler = new CommandHandler(this.api, this.config, this.authManager, this.logger);

            // Initialize Plugin Manager
            const PluginManager = require('./PluginManager');
            this.pluginManager = new PluginManager(this.api, this.config, this.authManager, this.commandHandler, this.logger);

            // Initialize Menu System
            const MenuSystem = require('./MenuSystem');
            this.menuSystem = new MenuSystem(this.api, this.config, this.authManager, this.logger);

            const COMPACT = (this.config.logging && this.config.logging.compact === true) || process.env.COMPACT_LOG === '1';
            if (!COMPACT) {
                if (this.logger) this.logger.system('Core systems initialized');
                else console.log('⚙️ Core systems initialized');
            }
        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Failed to initialize core systems');
            } else {
                console.error('❌ Failed to initialize core systems:', error);
            }
            throw error;
        }
    }

    async start() {
        try {
            if (this.isRunning) {
                if (this.logger) {
                    this.logger.warn('Bot is already running');
                } else {
                    console.log('⚠️ Bot is already running');
                }
                return;
            }

            const COMPACT = (this.config.logging && this.config.logging.compact === true) || process.env.COMPACT_LOG === '1';
            if (!COMPACT) {
                if (this.logger) this.logger.system('Starting ConvoX Bot...');
                else console.log('🎯 Starting ConvoX Bot...');
            }

            // Load plugins
            await this.pluginManager.loadPlugins();

            // Setup event listeners
            this.setupEventListeners();

            this.isRunning = true;
            if (!COMPACT) {
                if (this.logger) this.logger.success('ConvoX Bot is now running!');
                else console.log('✅ ConvoX Bot is now running!');
            }

            // Show menu if configured
            if (this.config.features.menu) {
                setTimeout(() => {
                    this.showWelcomeMessage();
                }, 2000);
            }

        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Failed to start bot');
            } else {
                console.error('❌ Failed to start bot:', error);
            }
            throw error;
        }
    }

    setupEventListeners() {
        // Message event listener
        this.api.listen((err, event) => {
            if (err) {
                if (this.logger) {
                    this.logger.logError(err, 'Event error');
                } else {
                    console.error('❌ Event error:', err);
                }
                return;
            }

            this.handleEvent(event);
        });

        const COMPACT = (this.config.logging && this.config.logging.compact === true) || process.env.COMPACT_LOG === '1';
        if (!COMPACT) {
            if (this.logger) this.logger.info('Event listeners setup complete');
            else console.log('👂 Event listeners setup complete');
        }
    }

    async handleEvent(event) {
        try {
            // Handle different event types
            switch (event.type) {
                case 'message':
                case 'message_reply': // Reply events should be processed like regular messages
                    await this.handleMessage(event);
                    break;
                case 'event':
                    await this.handleFbEvent(event);
                    break;
                default:
                    // Handle other events if needed
                    break;
            }
        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Error handling event');
            } else {
                console.error('❌ Error handling event:', error);
            }
        }
    }

    async handleMessage(event) {
        try {
            const { body, senderID, threadID, messageID } = event;

            // Skip if message is from bot itself
            if (senderID === this.api.getCurrentUserID()) {
                return;
            }

            // Check access control
            if (!this.authManager.hasAccess(senderID, threadID)) {
                // For regular users in unapproved groups, silently ignore
                if (this.logger) this.logger.debug(`Access denied for user ${senderID} in thread ${threadID}`);
                return;
            }

            // Auto mark as read if enabled
            if (this.config.bot.autoMarkRead) {
                this.api.markAsRead(threadID);
            }

            // Check for AutoDown plugin first (for messages without prefix)
            const autodownPlugin = this.pluginManager.getPlugin('autodown');
            if (autodownPlugin && typeof autodownPlugin.handleMessage === 'function') {
                const handled = await autodownPlugin.handleMessage(event);
                if (handled) {
                    return; // AutoDown handled the message, no need to process further
                }
            }
            // Handle numeric reply without prefix: category open or command detail within a category
            const selection = (body || '').trim();
            if (/^\d+$/.test(selection)) {
                await this.menuSystem.handleNumericSelection(threadID, senderID, selection);
                return;
            }


            // Check for Assistant Ngọc plugin (only when no command prefix is used)
            const assistantNgocPlugin = this.pluginManager.getPlugin('assistant_ngoc');
            const prefixEnv = process.env.BOT_PREFIX || this.config.bot.prefix || '!';
            const startsWithPrefix = (body || '').startsWith(prefixEnv);
            if (!startsWithPrefix && assistantNgocPlugin && typeof assistantNgocPlugin.handleMessage === 'function') {
                const handled = await assistantNgocPlugin.handleMessage(event);
                if (handled) {
                    return; // Assistant Ngọc handled the message, no need to process further
                }
            }

            // Check if message starts with prefix
            const prefix = this.config.bot.prefix || process.env.BOT_PREFIX || '!';
            if (!body.startsWith(prefix)) {
                return;
            }

            // Extract command and arguments
            const args = body.slice(prefix.length).trim().split(' ');
            const command = args[0].toLowerCase();
            const commandArgs = args.slice(1);

            if (this.logger) {
                this.logger.command(command, senderID, threadID);
            } else {
                console.log(`📨 Command received: ${command} from ${senderID} in ${threadID}`);
            }

            // Handle menu system
            if (this.menuSystem.isMenuCommand(command, commandArgs)) {
                await this.menuSystem.handleMenuCommand(event, command, commandArgs);
                return;
            }

            // When a real command is issued, clear ephemeral menu messages to avoid chat spam
            try { await this.menuSystem.clearEphemeralForThread(threadID); } catch {}

            // Handle regular commands
            await this.commandHandler.handleCommand(event, command, commandArgs);

        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Error handling message');
            } else {
                console.error('❌ Error handling message:', error);
            }
        }
    }

    async handleFbEvent(event) {
        try {
            // Detect when bot is added to a group or new group created with bot
            // fca-unofficial emits 'event' with logMessageType
            const { logMessageType, threadID, author } = event;
            const type = logMessageType || event.logMessageData?.type;

            if (!threadID) return;

            if (type === 'log:subscribe' || type === 'log:thread-create') {
                // On subscribe, check if bot is among added participants
                const addedIDs = (event.logMessageData && event.logMessageData.addedParticipants) ? event.logMessageData.addedParticipants.map(p => p.userFbId || p.userID || p.userId).filter(Boolean) : [];
                const botID = this.api.getCurrentUserID();
                const botAdded = addedIDs.includes(botID);
                if (botAdded || type === 'log:thread-create') {
                    // Try to fetch info and record as pending
                    let threadName = '', ownerID = author;
                    try {
                        const info = await this.api.getThreadInfo(threadID);
                        threadName = info?.threadName || '';
                        // attempt owner as first admin or threadAdminIDs
                        const adminIDs = info?.adminIDs || info?.threadAdminIDs || [];
                        if (!ownerID && Array.isArray(adminIDs) && adminIDs.length > 0) ownerID = adminIDs[0];
                    } catch {}

                    await this.authManager.recordPendingGroup(threadID, { name: threadName, owner: ownerID || '' });
                    await this.notifyAdminsAboutNewGroup(threadID, author);
                }
            }
        } catch (error) {
            if (this.logger) this.logger.logError(error, 'Error handling FB event');
            else console.error('❌ Error handling FB event:', error);
        }
    }

    async notifyAdminsAboutNewGroup(threadID, authorID) {
        try {
            const adminIDs = this.authManager.getAdmins();
            if (!adminIDs || adminIDs.length === 0) return;

            // Try to get thread info
            let threadName = '';
            try {
                const info = await this.api.getThreadInfo(threadID);
                threadName = info?.threadName || '';
            } catch {}

            const msg = `📣 Bot vừa được thêm vào nhóm mới\n` +
                        `🆔 Thread ID: ${threadID}${threadName ? `\n🧭 Tên nhóm: ${threadName}` : ''}\n` +
                        `${authorID ? `👤 Bởi: ${authorID}\n` : ''}` +
                        `⚙️ Phê duyệt nhanh: Hãy REPLY tin nhắn này với \"!group allow\" để duyệt.\n` +
                        `🔧 Hoặc: \"!group allow ${threadID}\"`;

            // Send DM to each admin/owner and store approval reference
            await Promise.all(adminIDs.map(async uid => {
                const res = await this.commandHandler.sendMessage(uid, msg);
                try {
                    const sentMsgId = typeof res === 'string' ? res : (res?.messageID || res?.messageId || res?.threadID);
                    if (sentMsgId) {
                        await this.authManager.recordApprovalRef(sentMsgId, threadID);
                    }
                } catch {}
            }));
        } catch (error) {
            if (this.logger) this.logger.logError(error, 'Failed to notify admins about new group');
        }
    }

    async showWelcomeMessage() {
        try {
            const prefix = this.config.bot.prefix || '!';
            const welcomeMessage = `
🎉 Chào mừng đến với ConvoX Bot!

Gõ "${prefix}menu" để xem danh sách lệnh

Bot đã sẵn sàng phục vụ! 🚀
            `;

            // Send to all threads or specific thread
            // This is a placeholder - implement based on your needs
            if (this.logger) {
                this.logger.info('Welcome message:', welcomeMessage);
            } else {
                console.log('📢 Welcome message:', welcomeMessage);
            }
        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Error showing welcome message');
            } else {
                console.error('❌ Error showing welcome message:', error);
            }
        }
    }

    getUptime() {
        return Date.now() - this.startTime;
    }

    getStatus() {
        return {
            running: this.isRunning,
            uptime: this.getUptime(),
            commands: this.commandHandler ? this.commandHandler.getCommandCount() : 0,
            plugins: this.pluginManager ? this.pluginManager.getPluginCount() : 0,
            restartStats: this.autoRestart ? this.autoRestart.getStats() : null
        };
    }

    async stop() {
        try {
            if (this.logger) {
                this.logger.system('Stopping ConvoX Bot...');
            } else {
                console.log('🛑 Stopping ConvoX Bot...');
            }
            this.isRunning = false;
            if (this.logger) {
                this.logger.success('Bot stopped');
            } else {
                console.log('✅ Bot stopped');
            }
        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Error stopping bot');
            } else {
                console.error('❌ Error stopping bot:', error);
            }
        }
    }
}

module.exports = BotManager;
