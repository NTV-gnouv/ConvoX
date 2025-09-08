const Logger = require('./Logger');

class CommandHandler {
    constructor(api, config, authManager, logger) {
        this.api = api;
        this.config = config;
        this.authManager = authManager;
        this.logger = logger;
        this.commands = new Map();
        this.aliases = new Map();
        this.cooldowns = new Map();
        this.stats = {
            totalCommands: 0,
            commandsByCategory: {},
            mostUsedCommands: []
        };
    }

    registerCommand(command, handler, options = {}) {
        try {
            const commandData = {
                name: command,
                handler: handler,
                description: options.description || 'No description',
                usage: options.usage || `!${command}`,
                example: options.example || `!${command}`,
                category: options.category || 'general',
                cooldown: options.cooldown || 0,
                adminOnly: options.adminOnly || false,
                minRole: options.minRole || 0, // 0=USER, 1=MOD, 2=ADMIN, 3=OWNER
                enabled: options.enabled !== false
            };

            this.commands.set(command, commandData);
            
            // Register aliases if provided
            if (options.aliases && Array.isArray(options.aliases)) {
                options.aliases.forEach(alias => {
                    this.aliases.set(alias, command);
                });
            }

            // Don't log individual command registration to reduce spam
            // this.logger.info(`Command registered: ${command}`);
            return true;
        } catch (error) {
            this.logger.logError(error, `Failed to register command ${command}`);
            return false;
        }
    }

    async handleCommand(event, command, args) {
        try {
            const { senderID, threadID, messageID } = event;
            
            // Check if command exists (including aliases)
            const actualCommand = this.commands.get(command) || this.commands.get(this.aliases.get(command));
            
            if (!actualCommand) {
                await this.sendMessage(threadID, `❌ Lệnh "${command}" không tồn tại!\nGõ "${this.config.bot.prefix}menu" để xem danh sách lệnh.`);
                return;
            }

            // Check if command is enabled
            if (!actualCommand.enabled) {
                await this.sendMessage(threadID, `❌ Lệnh "${command}" đã bị tắt!`);
                return;
            }

            // Check permissions using new auth system
            if (actualCommand.adminOnly && !this.authManager.isAdmin(senderID)) {
                await this.sendMessage(threadID, `❌ Bạn không có quyền sử dụng lệnh này!`);
                return;
            }

            // Check minimum role requirement
            if (actualCommand.minRole > 0 && !this.authManager.hasPermission(senderID, actualCommand.minRole, threadID)) {
                const roleName = this.authManager.getUserRoleName(senderID, threadID);
                const requiredRole = this.getRoleName(actualCommand.minRole);
                await this.sendMessage(threadID, `❌ Lệnh này yêu cầu quyền ${requiredRole} trở lên. Quyền hiện tại của bạn: ${roleName}`);
                return;
            }

            // Check cooldown
            if (this.isOnCooldown(senderID, command, actualCommand.cooldown)) {
                const remainingTime = this.getCooldownRemaining(senderID, command);
                await this.sendMessage(threadID, `⏰ Vui lòng đợi ${remainingTime} giây trước khi sử dụng lệnh này!`);
                return;
            }

            // Set cooldown
            this.setCooldown(senderID, command, actualCommand.cooldown);

            // Update stats
            this.updateStats(command, actualCommand.category);

            // Execute command
            this.logger.debug(`Executing command: ${command} by ${senderID}`);
            await actualCommand.handler(event, args);

        } catch (error) {
            this.logger.logError(error, `Error handling command ${command}`);
            await this.sendMessage(event.threadID, `❌ Đã xảy ra lỗi khi thực hiện lệnh!`);
        }
    }

    async sendMessage(threadID, message, callback, retries = 2) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await this.api.sendMessage(message, threadID, callback);
            } catch (error) {
                if (attempt === retries) {
                    // Final attempt failed
                    if (error.statusCode === 404) {
                        this.logger.throttledLog('warn', 'Facebook API temporarily unavailable (404)', null, 'api_404');
                    } else {
                        this.logger.throttledLog('warn', `Send message failed: ${error.message || 'Unknown error'}`, null, 'send_message_error');
                    }
                    return null;
                }
                
                // Wait a bit before retry
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
    }

    getRoleName(roleLevel) {
        const roleNames = {
            0: 'User',
            1: 'Moderator', 
            2: 'Admin',
            3: 'Owner'
        };
        return roleNames[roleLevel] || 'User';
    }

    isAdmin(userID) {
        return this.authManager.isAdmin(userID);
    }

    isOnCooldown(userID, command, cooldownTime) {
        if (cooldownTime <= 0) return false;
        
        const key = `${userID}_${command}`;
        const lastUsed = this.cooldowns.get(key);
        
        if (!lastUsed) return false;
        
        return (Date.now() - lastUsed) < (cooldownTime * 1000);
    }

    getCooldownRemaining(userID, command) {
        const key = `${userID}_${command}`;
        const lastUsed = this.cooldowns.get(key);
        const commandData = this.commands.get(command);
        
        if (!lastUsed || !commandData) return 0;
        
        const remaining = commandData.cooldown - Math.floor((Date.now() - lastUsed) / 1000);
        return Math.max(0, remaining);
    }

    setCooldown(userID, command, cooldownTime) {
        if (cooldownTime <= 0) return;
        
        const key = `${userID}_${command}`;
        this.cooldowns.set(key, Date.now());
    }

    updateStats(command, category) {
        this.stats.totalCommands++;
        
        if (!this.stats.commandsByCategory[category]) {
            this.stats.commandsByCategory[category] = 0;
        }
        this.stats.commandsByCategory[category]++;

        // Update most used commands
        const existingIndex = this.stats.mostUsedCommands.findIndex(cmd => cmd.command === command);
        if (existingIndex >= 0) {
            this.stats.mostUsedCommands[existingIndex].count++;
        } else {
            this.stats.mostUsedCommands.push({ command, count: 1 });
        }

        // Sort by count
        this.stats.mostUsedCommands.sort((a, b) => b.count - a.count);
        
        // Keep only top 10
        if (this.stats.mostUsedCommands.length > 10) {
            this.stats.mostUsedCommands = this.stats.mostUsedCommands.slice(0, 10);
        }
    }

    getCommandCount() {
        return this.commands.size;
    }

    getStats() {
        return {
            ...this.stats,
            registeredCommands: this.commands.size,
            aliases: this.aliases.size
        };
    }

    getCommandInfo(command) {
        return this.commands.get(command) || this.commands.get(this.aliases.get(command));
    }

    getAllCommands() {
        return Array.from(this.commands.values());
    }

    getCommandsByCategory(category) {
        return Array.from(this.commands.values()).filter(cmd => cmd.category === category);
    }

    async reloadCommand(command) {
        try {
            // This would reload a specific command from file
            // Implementation depends on how commands are loaded
            this.logger.info(`Reloading command: ${command}`);
            return true;
        } catch (error) {
            this.logger.logError(error, `Failed to reload command ${command}`);
            return false;
        }
    }
}

module.exports = CommandHandler;
