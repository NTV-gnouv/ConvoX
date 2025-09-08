const ErrorLogger = require('./ErrorLogger');

class MenuSystem {
    constructor(api, config, authManager, logger) {
        this.api = api;
        this.config = config;
        this.commands = config.commands;
        this.menuConfig = config.commands.menu;
        this.categories = config.commands.categories;
        this.errorLogger = new ErrorLogger(logger);
        this.authManager = authManager;
        this.logger = logger;
    // Per-thread UI context to support numeric replies for command details
    this.uiContext = new Map(); // threadID -> { type: 'category', categoryKey, commands: Command[] }
    // Track ephemeral messages (menu/category/detail) for each thread to auto-unsend
    this.ephemeral = new Map(); // threadID -> Array<{ id, timer }>
    }

    isMenuCommand(command, args) {
    const menuCommands = ['menu', 'commands', 'list'];
        return menuCommands.includes(command.toLowerCase());
    }

    async handleMenuCommand(event, command, args) {
        try {
        const { threadID, senderID } = event;
            
            switch (command.toLowerCase()) {
                case 'menu':
            await this.showMainMenu(threadID, senderID);
                    break;
                // 'help' command removed
                case 'commands':
            await this.showCommands(threadID, senderID);
                    break;
                case 'list':
            await this.showCommandList(threadID, senderID);
                    break;
                default:
            await this.showMainMenu(threadID, senderID);
                    break;
            }
        } catch (error) {
            this.logger.logError(error, 'Error handling menu command');
            // Try to send a simple error message
            try {
                await this.sendMessage(event.threadID, '❌ Đã xảy ra lỗi khi hiển thị menu!');
            } catch (fallbackError) {
                this.logger.logError(fallbackError, 'Fallback error message also failed');
            }
        }
    }

    async showMainMenu(threadID, senderID) {
        try {
            const role = senderID ? this.authManager.getUserRole(senderID) : 0;
            const botName = (this.config.bot && this.config.bot.name) || process.env.BOT_NAME || 'ConvoX';
            const botVersion = (this.config.bot && this.config.bot.version) || process.env.BOT_VERSION || '1.0.0';

            let menuText = '';
            const titleIcon = '🤖';
            const line = '________________________';
            menuText += `${line}\n`;
            menuText += `| ${titleIcon} Menu ${botName} (v${botVersion})\n`;
            menuText += `| ${line}\n`;

            // Build compact category list with visible command counts
            Object.keys(this.categories).forEach(key => {
                const category = this.categories[key];
                const count = (category.commands || []).filter(c => (c.minRole || 0) <= role).length;
                menuText += `| ${key}. ${category.name} -> ${count} lệnh\n`;
            });

            menuText += `| ${line}\n`;
            menuText += `💡 Reply số (1-${Object.keys(this.categories).length}) để xem chi tiết\n`;
            menuText += `${line}`;
            
            // Clear previous ephemeral messages for this thread
            await this.clearEphemeralForThread(threadID);
            await this.sendMessage(threadID, menuText, { ephemeral: true });
            // Clear context on main menu
            this.uiContext.delete(threadID);
        } catch (error) {
            console.error('❌ Error showing main menu:', error);
        }
    }

    async showCategoryCommands(threadID, categoryKey, senderID = null) {
        try {
            const category = this.categories[categoryKey];
            if (!category) {
                await this.sendMessage(threadID, '❌ Category không tồn tại!');
                return;
            }

            const botName = (this.config.bot && this.config.bot.name) || process.env.BOT_NAME || 'ConvoX';
            const botVersion = (this.config.bot && this.config.bot.version) || process.env.BOT_VERSION || '1.0.0';
            const line = '________________________';

            let categoryText = `${line}\n`;
            categoryText += `📂 ${category.name} — ${botName} (v${botVersion})\n`;
            categoryText += `${line}\n\n`;
            categoryText += `📋 Danh sách lệnh:\n\n`;

            const role = senderID ? this.authManager.getUserRole(senderID) : 0;
            const visible = category.commands.filter(cmd => (cmd.minRole || 0) <= role);

            if (visible.length === 0) {
                await this.sendMessage(threadID, '🔒 Bạn không có quyền xem các lệnh trong category này.');
                return;
            }

            // Compact list: index -> usage | description (no command name)
            visible.forEach((cmd, index) => {
                const usage = cmd.usage || `!${cmd.name}`;
                const desc = cmd.description || '';
                categoryText += `${index + 1} -> ${usage} | ${desc}\n`;
            });

            categoryText += `\n💡 Reply số thứ tự để xem chi tiết lệnh`;
            categoryText += `\n💡 Gõ "${this.config.bot.prefix}menu" để quay lại menu chính`;

            // Clear previous ephemeral messages for this thread
            await this.clearEphemeralForThread(threadID);
            await this.sendMessage(threadID, categoryText, { ephemeral: true });
            // Save context for numeric reply -> command detail
            this.uiContext.set(threadID, { type: 'category', categoryKey, commands: visible });
        } catch (error) {
            console.error('❌ Error showing category commands:', error);
        }
    }

    // Handle numeric reply: either category selection (1..N) or command detail within a category
    async handleNumericSelection(threadID, senderID, selection) {
        try {
            const number = parseInt(selection, 10);
            if (Number.isNaN(number) || number <= 0) return;

            const ctx = this.uiContext.get(threadID);
            if (ctx && ctx.type === 'category') {
                const list = ctx.commands || [];
                if (number >= 1 && number <= list.length) {
                    const cmd = list[number - 1];
                    await this.showCommandDetail(threadID, cmd);
                    return;
                }
            }

            // Fallback: treat as category selection key if exists
            const key = selection.toString();
            if (this.categories[key]) {
                await this.showCategoryCommands(threadID, key, senderID);
                return;
            }

            // If invalid selection
            await this.sendMessage(threadID, `❌ Lựa chọn "${selection}" không hợp lệ.`);
        } catch (error) {
            console.error('❌ Error handling numeric selection:', error);
        }
    }

    async showCommandDetail(threadID, cmd) {
        try {
            const name = cmd.name || 'N/A';
            const desc = cmd.description || 'Không có mô tả';
            const usage = cmd.usage || `!${name}`;
            const example = cmd.example || `!${name}`;

            const detail = `🧩 Chi tiết lệnh ${name}\n` +
                           `Tên lệnh: ${name}\n` +
                           `Mô tả: ${desc}\n` +
                           `Cách dùng: ${usage}\n` +
                           `Ví dụ: ${example}`;

            // Clear previous ephemeral messages for this thread
            await this.clearEphemeralForThread(threadID);
            await this.sendMessage(threadID, detail, { ephemeral: true });
        } catch (error) {
            console.error('❌ Error showing command detail:', error);
        }
    }

    // help view removed

    async showCommands(threadID, senderID = null) {
        try {
            let commandsText = `📋 **DANH SÁCH TẤT CẢ LỆNH**\n\n`;
            const role = senderID ? this.authManager.getUserRole(senderID) : 0;
            
            Object.keys(this.categories).forEach(key => {
                const category = this.categories[key];
                commandsText += `📂 **${category.name}**\n`;
                
                category.commands
                    .filter(cmd => (cmd.minRole || 0) <= role)
                    .forEach(cmd => {
                        commandsText += `• \`${cmd.name}\` - ${cmd.description}\n`;
                    });
                
                commandsText += `\n`;
            });

            commandsText += `💡 Gõ "${this.config.bot.prefix}menu" để xem chi tiết từng category`;

            await this.sendMessage(threadID, commandsText);
        } catch (error) {
            console.error('❌ Error showing commands:', error);
        }
    }

    async showCommandList(threadID, senderID = null) {
        try {
            let listText = `📝 **DANH SÁCH LỆNH THEO THỨ TỰ**\n\n`;
            const role = senderID ? this.authManager.getUserRole(senderID) : 0;
            
            let commandIndex = 1;
            Object.keys(this.categories).forEach(key => {
                const category = this.categories[key];
                listText += `**${category.name}:**\n`;
                
                category.commands
                    .filter(cmd => (cmd.minRole || 0) <= role)
                    .forEach(cmd => {
                        listText += `${commandIndex}. \`${cmd.name}\`\n`;
                        commandIndex++;
                    });
                
                listText += `\n`;
            });

            await this.sendMessage(threadID, listText);
        } catch (error) {
            console.error('❌ Error showing command list:', error);
        }
    }

    async handleCategorySelection(threadID, selection, senderID = null) {
        try {
            const categoryKey = selection.toString();
            if (this.categories[categoryKey]) {
                await this.showCategoryCommands(threadID, categoryKey, senderID);
            } else {
                await this.sendMessage(threadID, `❌ Category "${selection}" không tồn tại!\nGõ "${this.config.bot.prefix}menu" để xem danh sách category.`);
            }
        } catch (error) {
            console.error('❌ Error handling category selection:', error);
        }
    }

    async sendMessage(threadID, message, options = {}, retries = 2) {
        const { ephemeral = false, ttl = 60000 } = options;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const info = await new Promise((resolve, reject) => {
                    this.api.sendMessage(message, threadID, (err, msgInfo) => {
                        if (err) reject(err);
                        else resolve(msgInfo);
                    });
                });

                // Schedule auto-unsend if requested
                if (ephemeral && info && info.messageID) {
                    this.scheduleEphemeral(threadID, info.messageID, ttl);
                }

                return info;
            } catch (error) {
                if (attempt === retries) {
                    // Final attempt failed
                    this.errorLogger.logError('Send message failed', error);
                    return null;
                }
                // Wait a bit before retry
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
    }

    scheduleEphemeral(threadID, messageID, ttlMs = 60000) {
        const timers = this.ephemeral.get(threadID) || [];
        const timer = setTimeout(async () => {
            try {
                await this.api.unsendMessage(messageID);
            } catch (e) {
                // ignore unsend errors
            } finally {
                this.removeEphemeral(threadID, messageID);
            }
        }, ttlMs);
        timers.push({ id: messageID, timer });
        this.ephemeral.set(threadID, timers);
    }

    async clearEphemeralForThread(threadID) {
        const timers = this.ephemeral.get(threadID);
        if (!timers || timers.length === 0) return;
        // Clear timers and unsend messages
        for (const { id, timer } of timers) {
            try { if (timer) clearTimeout(timer); } catch {}
            try { await this.api.unsendMessage(id); } catch {}
        }
        this.ephemeral.delete(threadID);
    }

    removeEphemeral(threadID, messageID) {
        const timers = this.ephemeral.get(threadID);
        if (!timers) return;
        const next = timers.filter(entry => entry.id !== messageID);
        if (next.length === 0) this.ephemeral.delete(threadID);
        else this.ephemeral.set(threadID, next);
    }

    getCategoryCount() {
        return Object.keys(this.categories).length;
    }

    getTotalCommands() {
        let total = 0;
        Object.values(this.categories).forEach(category => {
            total += category.commands.length;
        });
        return total;
    }

    getCategoryInfo(categoryKey) {
        return this.categories[categoryKey] || null;
    }

    getAllCategories() {
        return Object.keys(this.categories).map(key => ({
            key,
            ...this.categories[key]
        }));
    }

    async searchCommand(query) {
        try {
            const results = [];
            const searchQuery = query.toLowerCase();
            
            Object.keys(this.categories).forEach(categoryKey => {
                const category = this.categories[categoryKey];
                category.commands.forEach(cmd => {
                    if (cmd.name.toLowerCase().includes(searchQuery) ||
                        cmd.description.toLowerCase().includes(searchQuery)) {
                        results.push({
                            category: category.name,
                            categoryKey,
                            command: cmd
                        });
                    }
                });
            });
            
            return results;
        } catch (error) {
            console.error('❌ Error searching commands:', error);
            return [];
        }
    }
}

module.exports = MenuSystem;
