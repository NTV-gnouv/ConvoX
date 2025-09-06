class CommandHandler {
    constructor(api, config) {
        this.api = api;
        this.config = config;
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
                enabled: options.enabled !== false
            };

            this.commands.set(command, commandData);
            
            // Register aliases if provided
            if (options.aliases && Array.isArray(options.aliases)) {
                options.aliases.forEach(alias => {
                    this.aliases.set(alias, command);
                });
            }

            console.log(`✅ Command registered: ${command}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to register command ${command}:`, error);
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

            // Check admin permissions
            if (actualCommand.adminOnly && !this.isAdmin(senderID)) {
                await this.sendMessage(threadID, `❌ Bạn không có quyền sử dụng lệnh này!`);
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
            console.log(`🎯 Executing command: ${command} by ${senderID}`);
            await actualCommand.handler(event, args);

        } catch (error) {
            console.error(`❌ Error handling command ${command}:`, error);
            await this.sendMessage(event.threadID, `❌ Đã xảy ra lỗi khi thực hiện lệnh!`);
        }
    }

    async sendMessage(threadID, message, callback) {
        try {
            return await this.api.sendMessage(message, threadID, callback);
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            throw error;
        }
    }

    isAdmin(userID) {
        return this.config.bot.admin.includes(userID);
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
            console.log(`🔄 Reloading command: ${command}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to reload command ${command}:`, error);
            return false;
        }
    }
}

module.exports = CommandHandler;
