/**
 * Admin Commands Plugin
 * Quản lý phân quyền và các lệnh admin
 */
class AdminCommands {
    constructor(api, config, authManager) {
        this.api = api;
        this.config = config;
        this.authManager = authManager;
    }

    /**
     * Initialize plugin
     */
    async initialize() {
        console.log('🔧 Admin Commands plugin initialized');
    }

    /**
     * Register admin commands
     */
    registerCommands(commandHandler) {
        // Lệnh admin chính - chỉ owner mới có thể sử dụng
        commandHandler.registerCommand('admin', this.handleAdminCommand.bind(this), {
            description: 'Quản lý phân quyền admin/moderator',
            usage: '!admin <grant|revoke|list|whoami> [userID]',
            example: '!admin grant 1000123456789',
            category: 'admin',
            minRole: 3, // Chỉ owner
            aliases: ['adm', 'permission']
        });

        // Lệnh kiểm tra quyền của bản thân
        commandHandler.registerCommand('whoami', this.handleWhoAmI.bind(this), {
            description: 'Kiểm tra quyền của bản thân',
            usage: '!whoami',
            example: '!whoami',
            category: 'info',
            aliases: ['me', 'role']
        });

        // Lệnh reload permissions
        commandHandler.registerCommand('reloadperms', this.handleReloadPerms.bind(this), {
            description: 'Tải lại cấu hình phân quyền',
            usage: '!reloadperms',
            example: '!reloadperms',
            category: 'admin',
            minRole: 3, // Chỉ owner
            aliases: ['reloadpermissions']
        });

        // Lệnh stats admin
        commandHandler.registerCommand('adminstats', this.handleAdminStats.bind(this), {
            description: 'Xem thống kê phân quyền',
            usage: '!adminstats',
            example: '!adminstats',
            category: 'admin',
            minRole: 2, // Admin trở lên
            aliases: ['astats', 'permissions']
        });
    }

    /**
     * Handle main admin command
     */
    async handleAdminCommand(event, args) {
        const { senderID, threadID } = event;
        
        if (args.length === 0) {
            await this.sendMessage(threadID, this.getAdminHelp());
            return;
        }

        const action = args[0].toLowerCase();
        const targetID = args[1];

        switch (action) {
            case 'grant':
                await this.handleGrantModerator(event, targetID);
                break;
            case 'revoke':
                await this.handleRevokeModerator(event, targetID);
                break;
            case 'list':
                await this.handleListPermissions(event);
                break;
            case 'whoami':
                await this.handleWhoAmI(event);
                break;
            default:
                await this.sendMessage(threadID, `❌ Hành động "${action}" không hợp lệ!\n${this.getAdminHelp()}`);
        }
    }

    /**
     * Grant moderator role
     */
    async handleGrantModerator(event, targetID) {
        const { senderID, threadID } = event;

        if (!targetID) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp User ID để cấp quyền moderator!');
            return;
        }

        if (!this.isValidUserID(targetID)) {
            await this.sendMessage(threadID, '❌ User ID không hợp lệ!');
            return;
        }

        const success = await this.authManager.grantModerator(senderID, targetID);
        
        if (success) {
            await this.sendMessage(threadID, `✅ Đã cấp quyền Moderator cho ${targetID}`);
        } else {
            await this.sendMessage(threadID, '❌ Không thể cấp quyền moderator!');
        }
    }

    /**
     * Revoke moderator role
     */
    async handleRevokeModerator(event, targetID) {
        const { senderID, threadID } = event;

        if (!targetID) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp User ID để thu hồi quyền moderator!');
            return;
        }

        if (!this.isValidUserID(targetID)) {
            await this.sendMessage(threadID, '❌ User ID không hợp lệ!');
            return;
        }

        const success = await this.authManager.revokeModerator(senderID, targetID);
        
        if (success) {
            await this.sendMessage(threadID, `✅ Đã thu hồi quyền Moderator từ ${targetID}`);
        } else {
            await this.sendMessage(threadID, '❌ Không thể thu hồi quyền moderator!');
        }
    }

    /**
     * List all permissions
     */
    async handleListPermissions(event) {
        const { threadID } = event;
        
        const admins = this.authManager.getAdmins();
        const moderators = this.authManager.getModerators();
        
        let message = '📋 **Danh sách phân quyền:**\n\n';
        
        message += `👑 **Owners/Admins (${admins.length}):**\n`;
        admins.forEach(uid => {
            message += `• ${uid}\n`;
        });
        
        message += `\n👮 **Moderators (${moderators.length}):**\n`;
        if (moderators.length === 0) {
            message += '• Chưa có moderator nào\n';
        } else {
            moderators.forEach(uid => {
                message += `• ${uid}\n`;
            });
        }
        
        await this.sendMessage(threadID, message);
    }

    /**
     * Handle whoami command
     */
    async handleWhoAmI(event) {
        const { senderID, threadID } = event;
        
        const userInfo = this.authManager.getUserInfo(senderID);
        
        const message = `👤 **Thông tin quyền của bạn:**\n\n` +
                       `🆔 **User ID:** ${userInfo.userID}\n` +
                       `🎭 **Quyền:** ${userInfo.roleName}\n` +
                       `📊 **Level:** ${userInfo.role}/3\n\n` +
                       `✅ **Quyền có:**\n` +
                       `${userInfo.isOwner ? '• 👑 Owner' : ''}\n` +
                       `${userInfo.isAdmin ? '• 🔧 Admin' : ''}\n` +
                       `${userInfo.isModerator ? '• 👮 Moderator' : ''}\n` +
                       `${!userInfo.isModerator ? '• 👤 User' : ''}`;
        
        await this.sendMessage(threadID, message);
    }

    /**
     * Handle reload permissions
     */
    async handleReloadPerms(event) {
        const { threadID } = event;
        
        try {
            await this.authManager.reloadPermissions();
            await this.sendMessage(threadID, '✅ Đã tải lại cấu hình phân quyền thành công!');
        } catch (error) {
            console.error('❌ Failed to reload permissions:', error);
            await this.sendMessage(threadID, '❌ Lỗi khi tải lại cấu hình phân quyền!');
        }
    }

    /**
     * Handle admin stats
     */
    async handleAdminStats(event) {
        const { threadID } = event;
        
        const stats = this.authManager.getStats();
        
        const message = `📊 **Thống kê phân quyền:**\n\n` +
                       `👑 **Admins/Owners:** ${stats.totalAdmins}\n` +
                       `👮 **Moderators:** ${stats.totalModerators}\n` +
                       `📁 **File cấu hình:** ${stats.permissionsFile}\n` +
                       `🕒 **Cập nhật lần cuối:** ${new Date(stats.lastUpdated).toLocaleString('vi-VN')}`;
        
        await this.sendMessage(threadID, message);
    }

    /**
     * Get admin help message
     */
    getAdminHelp() {
        return `🔧 **Lệnh Admin:**\n\n` +
               `\`!admin grant <userID>\` - Cấp quyền Moderator\n` +
               `\`!admin revoke <userID>\` - Thu hồi quyền Moderator\n` +
               `\`!admin list\` - Xem danh sách phân quyền\n` +
               `\`!admin whoami\` - Kiểm tra quyền của bạn\n` +
               `\`!whoami\` - Kiểm tra quyền của bạn\n` +
               `\`!reloadperms\` - Tải lại cấu hình phân quyền\n` +
               `\`!adminstats\` - Xem thống kê phân quyền\n\n` +
               `⚠️ **Lưu ý:** Chỉ Owner mới có thể cấp/thu hồi quyền moderator!`;
    }

    /**
     * Validate user ID format
     */
    isValidUserID(userID) {
        return /^\d{10,20}$/.test(userID);
    }

    /**
     * Send message helper
     */
    async sendMessage(threadID, message) {
        try {
            return await this.api.sendMessage(message, threadID);
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            throw error;
        }
    }
}

module.exports = AdminCommands;
