/**
 * System Admin Plugin
 * Các lệnh admin hệ thống với phân quyền cao
 */
class SystemAdminPlugin {
    constructor(api, config, authManager) {
        this.api = api;
        this.config = config;
        this.authManager = authManager;
    }

    async initialize() {
        console.log('🔧 System Admin Plugin initialized');
    }

    registerCommands(commandHandler) {
        // Lệnh restart bot - chỉ owner
        commandHandler.registerCommand('restart', this.handleRestart.bind(this), {
            description: 'Khởi động lại bot (chỉ owner)',
            usage: '!restart',
            example: '!restart',
            category: 'admin',
            minRole: 3, // Chỉ owner
            aliases: ['reboot']
        });

        // Lệnh shutdown bot - chỉ owner
        commandHandler.registerCommand('shutdown', this.handleShutdown.bind(this), {
            description: 'Tắt bot (chỉ owner)',
            usage: '!shutdown',
            example: '!shutdown',
            category: 'admin',
            minRole: 3, // Chỉ owner
            aliases: ['stop']
        });

        // Lệnh reload config - admin trở lên
        commandHandler.registerCommand('reload', this.handleReload.bind(this), {
            description: 'Tải lại cấu hình bot',
            usage: '!reload',
            example: '!reload',
            category: 'admin',
            minRole: 2, // Admin trở lên
            aliases: ['refresh']
        });

        // Lệnh ban user - moderator trở lên
        commandHandler.registerCommand('ban', this.handleBan.bind(this), {
            description: 'Cấm người dùng (moderator trở lên)',
            usage: '!ban <userID> [reason]',
            example: '!ban 1000123456789 Spam',
            category: 'moderation',
            minRole: 1, // Moderator trở lên
            aliases: ['block']
        });

        // Lệnh unban user - moderator trở lên
        commandHandler.registerCommand('unban', this.handleUnban.bind(this), {
            description: 'Bỏ cấm người dùng (moderator trở lên)',
            usage: '!unban <userID>',
            example: '!unban 1000123456789',
            category: 'moderation',
            minRole: 1, // Moderator trở lên
            aliases: ['unblock']
        });

        // Lệnh kick user - moderator trở lên
        commandHandler.registerCommand('kick', this.handleKick.bind(this), {
            description: 'Đuổi người dùng khỏi nhóm (moderator trở lên)',
            usage: '!kick <userID> [reason]',
            example: '!kick 1000123456789 Vi phạm nội quy',
            category: 'moderation',
            minRole: 1, // Moderator trở lên
            aliases: ['remove']
        });
    }

    async handleRestart(event) {
        const { threadID } = event;
        await this.sendMessage(threadID, '🔄 Bot sẽ khởi động lại trong 3 giây...');
        
        setTimeout(() => {
            process.exit(0);
        }, 3000);
    }

    async handleShutdown(event) {
        const { threadID } = event;
        await this.sendMessage(threadID, '🛑 Bot sẽ tắt trong 3 giây...');
        
        setTimeout(() => {
            process.exit(0);
        }, 3000);
    }

    async handleReload(event) {
        const { threadID } = event;
        
        try {
            // Reload permissions
            await this.authManager.reloadPermissions();
            
            // Reload config (placeholder)
            await this.sendMessage(threadID, '✅ Đã tải lại cấu hình thành công!');
        } catch (error) {
            console.error('❌ Failed to reload config:', error);
            await this.sendMessage(threadID, '❌ Lỗi khi tải lại cấu hình!');
        }
    }

    async handleBan(event, args) {
        const { threadID, senderID } = event;
        
        if (args.length === 0) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp User ID để cấm!');
            return;
        }

        const targetID = args[0];
        const reason = args.slice(1).join(' ') || 'Không có lý do';

        if (!this.isValidUserID(targetID)) {
            await this.sendMessage(threadID, '❌ User ID không hợp lệ!');
            return;
        }

        // Check if target is admin/owner
        if (this.authManager.isAdmin(targetID)) {
            await this.sendMessage(threadID, '❌ Không thể cấm admin/owner!');
            return;
        }

        // Placeholder for ban logic
        await this.sendMessage(threadID, `🚫 Đã cấm ${targetID}\n📝 Lý do: ${reason}\n👮 Thực hiện bởi: ${senderID}`);
    }

    async handleUnban(event, args) {
        const { threadID, senderID } = event;
        
        if (args.length === 0) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp User ID để bỏ cấm!');
            return;
        }

        const targetID = args[0];

        if (!this.isValidUserID(targetID)) {
            await this.sendMessage(threadID, '❌ User ID không hợp lệ!');
            return;
        }

        // Placeholder for unban logic
        await this.sendMessage(threadID, `✅ Đã bỏ cấm ${targetID}\n👮 Thực hiện bởi: ${senderID}`);
    }

    async handleKick(event, args) {
        const { threadID, senderID } = event;
        
        if (args.length === 0) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp User ID để đuổi!');
            return;
        }

        const targetID = args[0];
        const reason = args.slice(1).join(' ') || 'Không có lý do';

        if (!this.isValidUserID(targetID)) {
            await this.sendMessage(threadID, '❌ User ID không hợp lệ!');
            return;
        }

        // Check if target is admin/owner
        if (this.authManager.isAdmin(targetID)) {
            await this.sendMessage(threadID, '❌ Không thể đuổi admin/owner!');
            return;
        }

        try {
            // Try to remove user from thread
            await this.api.removeUserFromGroup(targetID, threadID);
            await this.sendMessage(threadID, `👢 Đã đuổi ${targetID} khỏi nhóm\n📝 Lý do: ${reason}\n👮 Thực hiện bởi: ${senderID}`);
        } catch (error) {
            console.error('❌ Failed to kick user:', error);
            await this.sendMessage(threadID, '❌ Không thể đuổi người dùng này!');
        }
    }

    isValidUserID(userID) {
        return /^\d{10,20}$/.test(userID);
    }

    async sendMessage(threadID, message) {
        try {
            return await this.api.sendMessage(message, threadID);
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            throw error;
        }
    }

    async cleanup() {
        console.log('🔧 System Admin Plugin cleaned up');
    }
}

module.exports = SystemAdminPlugin;
