const fs = require('fs-extra');
const path = require('path');

class BotManager {
    constructor() {
        this.api = null;
        this.config = null;
        this.commandHandler = null;
        this.pluginManager = null;
        this.menuSystem = null;
        this.isRunning = false;
        this.startTime = Date.now();
    }

    async initialize() {
        try {
            console.log('🚀 Initializing ConvoX Bot...');
            
            // Load configuration
            await this.loadConfig();
            
            // Initialize Facebook API
            await this.initializeFacebook();
            
            // Initialize core systems
            await this.initializeCoreSystems();
            
            console.log('✅ Bot initialized successfully!');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize bot:', error);
            return false;
        }
    }

    async loadConfig() {
        try {
            const pluginsConfig = await fs.readJson('./config/plugins.json');
            this.config = {
                bot: await fs.readJson('./config/bot.json'),
                commands: await fs.readJson('./config/commands.json'),
                plugins: pluginsConfig.plugins || pluginsConfig
            };
            console.log('📋 Configuration loaded');
        } catch (error) {
            console.error('❌ Failed to load configuration:', error);
            throw error;
        }
    }

    async initializeFacebook() {
        try {
            const fca = require('fca-unofficial');

                      // Determine state file path (supports fbstate and appstate)
                      const statePath = this.config.bot.facebook.fbstate || this.config.bot.facebook.appstate || './fbstate.json';

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
                    listenEvents: this.config.bot.facebook.listenEvents,
                    listenTyping: this.config.bot.facebook.listenTyping,
                    selfListen: this.config.bot.facebook.selfListen,
                    forceLogin: this.config.bot.facebook.forceLogin,
                    logLevel: this.config.bot.facebook.logLevel
                }, (err, api) => {
                    if (err) {
                        console.error('Facebook login error:', err);
                        reject(err);
                    } else {
                        console.log('🔗 Facebook API connected successfully');
                        resolve(api);
                    }
                });
            });

        } catch (error) {
            console.error('❌ Failed to connect to Facebook:', error);
            throw error;
        }
    }

    async initializeCoreSystems() {
        try {
            // Initialize Command Handler
            const CommandHandler = require('./CommandHandler');
            this.commandHandler = new CommandHandler(this.api, this.config);
            
            // Initialize Plugin Manager
            const PluginManager = require('./PluginManager');
            this.pluginManager = new PluginManager(this.api, this.config);
            
            // Initialize Menu System
            const MenuSystem = require('./MenuSystem');
            this.menuSystem = new MenuSystem(this.api, this.config);
            
            console.log('⚙️ Core systems initialized');
        } catch (error) {
            console.error('❌ Failed to initialize core systems:', error);
            throw error;
        }
    }

    async start() {
        try {
            if (this.isRunning) {
                console.log('⚠️ Bot is already running');
                return;
            }

            console.log('🎯 Starting ConvoX Bot...');
            
            // Load plugins
            await this.pluginManager.loadPlugins();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isRunning = true;
            console.log('✅ ConvoX Bot is now running!');
            
            // Show menu if configured
            if (this.config.bot.features.menu && this.config.plugins.pluginConfig.menu.showOnStart) {
                setTimeout(() => {
                    this.showWelcomeMessage();
                }, 2000);
            }
            
        } catch (error) {
            console.error('❌ Failed to start bot:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Message event listener
        this.api.listen((err, event) => {
            if (err) {
                console.error('❌ Event error:', err);
                return;
            }

            this.handleEvent(event);
        });

        console.log('👂 Event listeners setup complete');
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
            console.error('❌ Error handling event:', error);
        }
    }

    async handleMessage(event) {
        try {
            const { body, senderID, threadID, messageID } = event;
            
            // Skip if message is from bot itself
            if (senderID === this.api.getCurrentUserID()) {
                return;
            }

            // Auto mark as read if enabled
            if (this.config.bot.autoMarkRead) {
                this.api.markAsRead(threadID);
            }

            // Check if message starts with prefix
            if (!body.startsWith(this.config.bot.prefix)) {
                return;
            }

            // Extract command and arguments
            const args = body.slice(this.config.bot.prefix.length).trim().split(' ');
            const command = args[0].toLowerCase();
            const commandArgs = args.slice(1);

            console.log(`📨 Command received: ${command} from ${senderID}`);

            // Handle menu system
            if (this.menuSystem.isMenuCommand(command, commandArgs)) {
                await this.menuSystem.handleMenuCommand(event, command, commandArgs);
                return;
            }

            // Handle regular commands
            await this.commandHandler.handleCommand(event, command, commandArgs);

        } catch (error) {
            console.error('❌ Error handling message:', error);
        }
    }

    async showWelcomeMessage() {
        try {
            const welcomeMessage = `
🎉 Chào mừng đến với ConvoX Bot!

Gõ "${this.config.bot.prefix}menu" để xem danh sách lệnh
Gõ "${this.config.bot.prefix}help" để được hỗ trợ

Bot đã sẵn sàng phục vụ! 🚀
            `;
            
            // Send to all threads or specific thread
            // This is a placeholder - implement based on your needs
            console.log('📢 Welcome message:', welcomeMessage);
        } catch (error) {
            console.error('❌ Error showing welcome message:', error);
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
            console.log('🛑 Stopping ConvoX Bot...');
            this.isRunning = false;
            console.log('✅ Bot stopped');
        } catch (error) {
            console.error('❌ Error stopping bot:', error);
        }
    }
}

module.exports = BotManager;

