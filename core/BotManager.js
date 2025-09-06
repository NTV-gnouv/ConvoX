const fs = require('fs-extra');
const path = require('path');
const Logger = require('./Logger');

class BotManager {
    constructor() {
        this.api = null;
        this.config = null;
        this.commandHandler = null;
        this.pluginManager = null;
        this.menuSystem = null;
        this.authManager = null;
        this.isRunning = false;
        this.startTime = Date.now();
        this.logger = null;
    }

    async initialize() {
        try {
            // Load configuration first
            await this.loadConfig();
            
            // Initialize logger after config is loaded
            this.logger = new Logger(this.config.logging || {});
            
            if (this.logger) {
                this.logger.system('Initializing ConvoX Bot...');
            } else {
                console.log('🚀 Initializing ConvoX Bot...');
            }
            
            // Initialize Facebook API
            await this.initializeFacebook();
            
            // Initialize core systems
            await this.initializeCoreSystems();
            
            if (this.logger) {
                this.logger.success('Bot initialized successfully!');
            } else {
                console.log('✅ Bot initialized successfully!');
            }
            return true;
        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Failed to initialize bot');
            } else {
                console.error('❌ Failed to initialize bot:', error);
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
                commands: await fs.readJson('./config/commands.json'),
                plugins: pluginsConfig.plugins || pluginsConfig
            };
            if (this.logger) {
                this.logger.info('Configuration loaded');
            } else {
                console.log('📋 Configuration loaded');
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

                      // Determine state file path (supports fbstate and appstate)
                      const statePath = this.config.facebook.fbstate || this.config.facebook.appstate || './fbstate.json';

                      // Load state from file
                      const rawState = await fs.readJson(statePath);
                      const stateDataRaw = rawState.fbstate || rawState.fbState || rawState.fbAppState || rawState.appState || rawState;
          
                      // Ensure state is in correct format
                      if (!Array.isArray(stateDataRaw)) {
                          throw new Error('Invalid fbstate format. Expected an array.');
            }

            // Initialize Facebook API with appstate
            this.api = await new Promise((resolve, reject) => {
                fca({ appState: stateDataRaw }, {
                    listenEvents: this.config.facebook.listenEvents,
                    listenTyping: this.config.facebook.listenTyping,
                    selfListen: this.config.facebook.selfListen,
                    forceLogin: this.config.facebook.forceLogin,
                    logLevel: this.config.facebook.logLevel
                }, (err, api) => {
                    if (err) {
                        if (this.logger) {
                            this.logger.logError(err, 'Facebook login error');
                        } else {
                            console.error('Facebook login error:', err);
                        }
                        reject(err);
                    } else {
                        if (this.logger) {
                            this.logger.api('connected successfully');
                        } else {
                            console.log('🔗 Facebook API connected successfully');
                        }
                        resolve(api);
                    }
                });
            });

        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Failed to connect to Facebook');
            } else {
                console.error('❌ Failed to connect to Facebook:', error);
            }
            throw error;
        }
    }

    async initializeCoreSystems() {
        try {
            // Initialize Auth Manager first
            const AuthManager = require('./AuthManager');
            this.authManager = new AuthManager();
            
            // Initialize Command Handler
            const CommandHandler = require('./CommandHandler');
<<<<<<< HEAD
            this.commandHandler = new CommandHandler(this.api, this.config, this.authManager, this.logger);
            
            // Initialize Plugin Manager
            const PluginManager = require('./PluginManager');
            this.pluginManager = new PluginManager(this.api, this.config, this.authManager, this.commandHandler, this.logger);
            
            // Initialize Menu System
            const MenuSystem = require('./MenuSystem');
            this.menuSystem = new MenuSystem(this.api, this.config, this.authManager, this.logger);
=======
            this.commandHandler = new CommandHandler(this.api, this.config);
            
            // Initialize Plugin Manager
            const PluginManager = require('./PluginManager');
            this.pluginManager = new PluginManager(this.api, this.config);
            
            // Initialize Menu System
            const MenuSystem = require('./MenuSystem');
            this.menuSystem = new MenuSystem(this.api, this.config);
>>>>>>> f8065757ac9d1ed799b23b328b5d8a92943d64cf
            
            if (this.logger) {
                this.logger.system('Core systems initialized');
            } else {
                console.log('⚙️ Core systems initialized');
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

            if (this.logger) {
                this.logger.system('Starting ConvoX Bot...');
            } else {
                console.log('🎯 Starting ConvoX Bot...');
            }
            
            // Load plugins
            await this.pluginManager.loadPlugins();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isRunning = true;
            if (this.logger) {
                this.logger.success('ConvoX Bot is now running!');
            } else {
                console.log('✅ ConvoX Bot is now running!');
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

        if (this.logger) {
            this.logger.info('Event listeners setup complete');
        } else {
            console.log('👂 Event listeners setup complete');
        }
    }

    async handleEvent(event) {
        try {
            // Handle different event types
            switch (event.type) {
                case 'message':
                    await this.handleMessage(event);
                    break;
                case 'event':
                    await this.handleEvent(event);
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

            // Check if group is allowed to use bot (only for group chats)
            if (threadID && threadID.includes('_')) {
                // This is a group chat, check permissions
                if (!this.authManager.isGroupAllowed(threadID)) {
                    if (this.logger) {
                        this.logger.info(`Group ${threadID} is not allowed to use bot`);
                    } else {
                        console.log(`🚫 Group ${threadID} is not allowed to use bot`);
                    }
                    return;
                }
            }

            // Auto mark as read if enabled
            if (this.config.bot.autoMarkRead) {
                this.api.markAsRead(threadID);
            }

            // Check if message starts with prefix
            const prefix = this.config.bot.prefix || '!';
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

    async showWelcomeMessage() {
        try {
            const prefix = this.config.bot.prefix || '!';
            const welcomeMessage = `
🎉 Chào mừng đến với ConvoX Bot!

Gõ "${prefix}menu" để xem danh sách lệnh
Gõ "${prefix}help" để được hỗ trợ

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
            plugins: this.pluginManager ? this.pluginManager.getPluginCount() : 0
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

