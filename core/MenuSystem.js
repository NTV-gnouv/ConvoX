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
    }

    isMenuCommand(command, args) {
        const menuCommands = ['menu', 'help', 'commands', 'list'];
        return menuCommands.includes(command.toLowerCase());
    }

    async handleMenuCommand(event, command, args) {
        try {
            const { threadID } = event;
            
            switch (command.toLowerCase()) {
                case 'menu':
                    await this.showMainMenu(threadID);
                    break;
                case 'help':
                    await this.showHelp(threadID);
                    break;
                case 'commands':
                    await this.showCommands(threadID);
                    break;
                case 'list':
                    await this.showCommandList(threadID);
                    break;
                default:
                    await this.showMainMenu(threadID);
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

    async showMainMenu(threadID) {
        try {
            let menuText = `${this.menuConfig.title}\n`;
            menuText += `${this.menuConfig.subtitle}\n\n`;
            
            // Add categories
            Object.keys(this.categories).forEach(key => {
                const category = this.categories[key];
                menuText += `${key}. ${category.name}\n`;
                menuText += `   ${category.description}\n\n`;
            });
            
            menuText += `\n${this.menuConfig.footer}`;
            
            await this.sendMessage(threadID, menuText);
        } catch (error) {
            console.error('❌ Error showing main menu:', error);
        }
    }

    async showCategoryCommands(threadID, categoryKey) {
        try {
            const category = this.categories[categoryKey];
            if (!category) {
                await this.sendMessage(threadID, '❌ Category không tồn tại!');
                return;
            }

            let categoryText = `📂 ${category.name}\n`;
            categoryText += `${category.description}\n\n`;
            categoryText += `📋 Danh sách lệnh:\n\n`;

            category.commands.forEach((cmd, index) => {
                categoryText += `${index + 1}. **${cmd.name}**\n`;
                categoryText += `   📝 ${cmd.description}\n`;
                categoryText += `   💡 Cách dùng: \`${cmd.usage}\`\n`;
                categoryText += `   🔍 Ví dụ: \`${cmd.example}\`\n\n`;
            });

            categoryText += `\n💡 Gõ "${this.config.bot.prefix}menu" để quay lại menu chính`;

            await this.sendMessage(threadID, categoryText);
        } catch (error) {
            console.error('❌ Error showing category commands:', error);
        }
    }

    async showHelp(threadID) {
        try {
            const helpText = `
🆘 **HƯỚNG DẪN SỬ DỤNG CONVOX BOT**

👨‍💻 **Tác giả:** Thanh Vương  
🏗️ **Dự án:** ConvoX chatbot thế hệ mới

📖 **Cách sử dụng:**
• Gõ \`${this.config.bot.prefix}menu\` để xem menu chính
• Chọn số thứ tự category để xem lệnh (VD: 1, 2, 3...)
• Gõ lệnh với prefix \`${this.config.bot.prefix}\` (VD: \`${this.config.bot.prefix}ping\`)

🎯 **Lệnh cơ bản:**
• \`${this.config.bot.prefix}menu\` - Hiển thị menu chính
• \`${this.config.bot.prefix}help\` - Hiển thị hướng dẫn này
• \`${this.config.bot.prefix}info\` - Thông tin bot
• \`${this.config.bot.prefix}ping\` - Kiểm tra ping

🎮 **Lệnh giải trí:**
• \`${this.config.bot.prefix}dice\` - Gieo xúc xắc
• \`${this.config.bot.prefix}flip\` - Tung đồng xu
• \`${this.config.bot.prefix}joke\` - Kể chuyện cười

❓ **Cần hỗ trợ?**
Liên hệ admin để được hỗ trợ thêm!
            `;
            
            const result = await this.sendMessage(threadID, helpText);
            if (!result) {
                console.log('ℹ️ Help command processed (message delivery failed)');
            }
        } catch (error) {
            console.error('❌ Error showing help:', error);
            // Try to send a simple fallback message
            try {
                await this.sendMessage(threadID, '❌ Không thể hiển thị hướng dẫn. Vui lòng thử lại sau!');
            } catch (fallbackError) {
                console.error('❌ Fallback help message also failed:', fallbackError);
            }
        }
    }

    async showCommands(threadID) {
        try {
            let commandsText = `📋 **DANH SÁCH TẤT CẢ LỆNH**\n\n`;
            
            Object.keys(this.categories).forEach(key => {
                const category = this.categories[key];
                commandsText += `📂 **${category.name}**\n`;
                
                category.commands.forEach(cmd => {
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

    async showCommandList(threadID) {
        try {
            let listText = `📝 **DANH SÁCH LỆNH THEO THỨ TỰ**\n\n`;
            
            let commandIndex = 1;
            Object.keys(this.categories).forEach(key => {
                const category = this.categories[key];
                listText += `**${category.name}:**\n`;
                
                category.commands.forEach(cmd => {
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

    async handleCategorySelection(threadID, selection) {
        try {
            const categoryKey = selection.toString();
            if (this.categories[categoryKey]) {
                await this.showCategoryCommands(threadID, categoryKey);
            } else {
                await this.sendMessage(threadID, `❌ Category "${selection}" không tồn tại!\nGõ "${this.config.bot.prefix}menu" để xem danh sách category.`);
            }
        } catch (error) {
            console.error('❌ Error handling category selection:', error);
        }
    }

    async sendMessage(threadID, message, retries = 2) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await this.api.sendMessage(message, threadID);
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
