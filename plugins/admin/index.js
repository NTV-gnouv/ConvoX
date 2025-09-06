/**
 * Admin Commands Plugin
 * Quản lý phân quyền và các lệnh admin
 */
class AdminCommands {
    constructor(api, config, authManager, logger = null) {
        this.api = api;
        this.config = config;
        this.authManager = authManager;
        this.logger = logger;
    }

    /**
     * Initialize plugin
     */
    async initialize() {
        // Plugin initialized silently
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

        // ==================== GROUP MANAGEMENT COMMANDS ====================

        // Lệnh quản lý nhóm chat
        commandHandler.registerCommand('group', this.handleGroupCommand.bind(this), {
            description: 'Quản lý quyền truy cập nhóm chat',
            usage: '!group <allow|disallow|block|unblock|list|mode|clear> [threadID]',
            example: '!group allow 1234567890123456',
            category: 'admin',
            minRole: 3, // Chỉ owner
            aliases: ['groups', 'chat']
        });

        // Lệnh kiểm tra quyền nhóm hiện tại
        commandHandler.registerCommand('groupinfo', this.handleGroupInfo.bind(this), {
            description: 'Kiểm tra quyền của nhóm chat hiện tại',
            usage: '!groupinfo',
            example: '!groupinfo',
            category: 'info',
            aliases: ['ginfo', 'chatinfo']
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
               `🏠 **Lệnh quản lý nhóm:**\n` +
               `\`!group allow <threadID>\` - Cho phép nhóm sử dụng bot\n` +
               `\`!group disallow <threadID>\` - Cấm nhóm sử dụng bot\n` +
               `\`!group block <threadID>\` - Chặn nhóm\n` +
               `\`!group unblock <threadID>\` - Bỏ chặn nhóm\n` +
               `\`!group list\` - Xem danh sách nhóm\n` +
               `\`!group mode <whitelist|blacklist>\` - Đổi chế độ\n` +
               `\`!group clear\` - Xóa tất cả cài đặt nhóm\n` +
               `\`!groupinfo\` - Kiểm tra quyền nhóm hiện tại\n\n` +
               `⚠️ **Lưu ý:** Chỉ Owner mới có thể quản lý quyền!`;
    }

    // ==================== GROUP MANAGEMENT METHODS ====================

    /**
     * Handle group management command
     */
    async handleGroupCommand(event, args) {
        const { senderID, threadID } = event;
        
        if (args.length === 0) {
            await this.sendMessage(threadID, this.getGroupHelp());
            return;
        }

        const action = args[0].toLowerCase();
        const targetThreadID = args[1];

        switch (action) {
            case 'allow':
                await this.handleAllowGroup(event, targetThreadID);
                break;
            case 'disallow':
                await this.handleDisallowGroup(event, targetThreadID);
                break;
            case 'block':
                await this.handleBlockGroup(event, targetThreadID);
                break;
            case 'unblock':
                await this.handleUnblockGroup(event, targetThreadID);
                break;
            case 'list':
                await this.handleListGroups(event);
                break;
            case 'mode':
                await this.handleSetGroupMode(event, targetThreadID);
                break;
            case 'clear':
                await this.handleClearGroupSettings(event);
                break;
            default:
                await this.sendMessage(threadID, `❌ Hành động "${action}" không hợp lệ!\n${this.getGroupHelp()}`);
        }
    }

    /**
     * Allow group to use bot
     */
    async handleAllowGroup(event, targetThreadID) {
        const { senderID, threadID } = event;

        if (!targetThreadID) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp Thread ID để cho phép nhóm!');
            return;
        }

        if (!this.isValidThreadID(targetThreadID)) {
            await this.sendMessage(threadID, '❌ Thread ID không hợp lệ!');
            return;
        }

        const success = await this.authManager.allowGroup(senderID, targetThreadID);
        
        if (success) {
            await this.sendMessage(threadID, `✅ Đã cho phép nhóm ${targetThreadID} sử dụng bot`);
        } else {
            await this.sendMessage(threadID, '❌ Không thể cho phép nhóm này!');
        }
    }

    /**
     * Disallow group from using bot
     */
    async handleDisallowGroup(event, targetThreadID) {
        const { senderID, threadID } = event;

        if (!targetThreadID) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp Thread ID để cấm nhóm!');
            return;
        }

        if (!this.isValidThreadID(targetThreadID)) {
            await this.sendMessage(threadID, '❌ Thread ID không hợp lệ!');
            return;
        }

        const success = await this.authManager.disallowGroup(senderID, targetThreadID);
        
        if (success) {
            await this.sendMessage(threadID, `❌ Đã cấm nhóm ${targetThreadID} sử dụng bot`);
        } else {
            await this.sendMessage(threadID, '❌ Không thể cấm nhóm này!');
        }
    }

    /**
     * Block group
     */
    async handleBlockGroup(event, targetThreadID) {
        const { senderID, threadID } = event;

        if (!targetThreadID) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp Thread ID để chặn nhóm!');
            return;
        }

        if (!this.isValidThreadID(targetThreadID)) {
            await this.sendMessage(threadID, '❌ Thread ID không hợp lệ!');
            return;
        }

        const success = await this.authManager.blockGroup(senderID, targetThreadID);
        
        if (success) {
            await this.sendMessage(threadID, `🚫 Đã chặn nhóm ${targetThreadID}`);
        } else {
            await this.sendMessage(threadID, '❌ Không thể chặn nhóm này!');
        }
    }

    /**
     * Unblock group
     */
    async handleUnblockGroup(event, targetThreadID) {
        const { senderID, threadID } = event;

        if (!targetThreadID) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp Thread ID để bỏ chặn nhóm!');
            return;
        }

        if (!this.isValidThreadID(targetThreadID)) {
            await this.sendMessage(threadID, '❌ Thread ID không hợp lệ!');
            return;
        }

        const success = await this.authManager.unblockGroup(senderID, targetThreadID);
        
        if (success) {
            await this.sendMessage(threadID, `✅ Đã bỏ chặn nhóm ${targetThreadID}`);
        } else {
            await this.sendMessage(threadID, '❌ Không thể bỏ chặn nhóm này!');
        }
    }

    /**
     * List all groups
     */
    async handleListGroups(event) {
        const { threadID } = event;
        
        const allowedGroups = this.authManager.getAllowedGroups();
        const blockedGroups = this.authManager.getBlockedGroups();
        const groupMode = this.authManager.getGroupMode();
        
        let message = `🏠 **Danh sách quản lý nhóm:**\n\n`;
        message += `📋 **Chế độ:** ${groupMode === 'whitelist' ? 'Whitelist (chỉ nhóm được phép)' : 'Blacklist (chặn nhóm cụ thể)'}\n\n`;
        
        message += `✅ **Nhóm được phép (${allowedGroups.length}):**\n`;
        if (allowedGroups.length === 0) {
            message += '• Chưa có nhóm nào\n';
        } else {
            allowedGroups.forEach(threadID => {
                message += `• ${threadID}\n`;
            });
        }
        
        message += `\n❌ **Nhóm bị chặn (${blockedGroups.length}):**\n`;
        if (blockedGroups.length === 0) {
            message += '• Chưa có nhóm nào\n';
        } else {
            blockedGroups.forEach(threadID => {
                message += `• ${threadID}\n`;
            });
        }
        
        await this.sendMessage(threadID, message);
    }

    /**
     * Set group mode
     */
    async handleSetGroupMode(event, mode) {
        const { senderID, threadID } = event;

        if (!mode) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp chế độ (whitelist hoặc blacklist)!');
            return;
        }

        if (mode !== 'whitelist' && mode !== 'blacklist') {
            await this.sendMessage(threadID, '❌ Chế độ phải là "whitelist" hoặc "blacklist"!');
            return;
        }

        const success = await this.authManager.setGroupMode(senderID, mode);
        
        if (success) {
            await this.sendMessage(threadID, `🔄 Đã chuyển sang chế độ ${mode}`);
        } else {
            await this.sendMessage(threadID, '❌ Không thể thay đổi chế độ!');
        }
    }

    /**
     * Clear all group settings
     */
    async handleClearGroupSettings(event) {
        const { senderID, threadID } = event;

        const success = await this.authManager.clearGroupSettings(senderID);
        
        if (success) {
            await this.sendMessage(threadID, '🗑️ Đã xóa tất cả cài đặt nhóm');
        } else {
            await this.sendMessage(threadID, '❌ Không thể xóa cài đặt nhóm!');
        }
    }

    /**
     * Handle group info command
     */
    async handleGroupInfo(event) {
        const { senderID, threadID } = event;
        
        const isAllowed = this.authManager.isGroupAllowed(threadID);
        const groupMode = this.authManager.getGroupMode();
        const allowedGroups = this.authManager.getAllowedGroups();
        const blockedGroups = this.authManager.getBlockedGroups();
        
        let message = `🏠 **Thông tin nhóm chat:**\n\n`;
        message += `🆔 **Thread ID:** ${threadID}\n`;
        message += `📋 **Chế độ:** ${groupMode === 'whitelist' ? 'Whitelist' : 'Blacklist'}\n`;
        message += `✅ **Trạng thái:** ${isAllowed ? 'Được phép sử dụng bot' : 'Không được phép sử dụng bot'}\n\n`;
        
        if (groupMode === 'whitelist') {
            message += `📊 **Thống kê:**\n`;
            message += `• Nhóm được phép: ${allowedGroups.length}\n`;
            message += `• Nhóm bị chặn: ${blockedGroups.length}\n`;
        } else {
            message += `📊 **Thống kê:**\n`;
            message += `• Nhóm được phép: ${allowedGroups.length}\n`;
            message += `• Nhóm bị chặn: ${blockedGroups.length}\n`;
        }
        
        await this.sendMessage(threadID, message);
    }

    /**
     * Get group help message
     */
    getGroupHelp() {
        return `🏠 **Lệnh quản lý nhóm:**\n\n` +
               `\`!group allow <threadID>\` - Cho phép nhóm sử dụng bot\n` +
               `\`!group disallow <threadID>\` - Cấm nhóm sử dụng bot\n` +
               `\`!group block <threadID>\` - Chặn nhóm\n` +
               `\`!group unblock <threadID>\` - Bỏ chặn nhóm\n` +
               `\`!group list\` - Xem danh sách nhóm\n` +
               `\`!group mode <whitelist|blacklist>\` - Đổi chế độ\n` +
               `\`!group clear\` - Xóa tất cả cài đặt nhóm\n` +
               `\`!groupinfo\` - Kiểm tra quyền nhóm hiện tại\n\n` +
               `📋 **Chế độ:**\n` +
               `• **Whitelist:** Chỉ nhóm trong danh sách được phép mới có thể sử dụng bot\n` +
               `• **Blacklist:** Tất cả nhóm đều có thể sử dụng bot, trừ những nhóm bị chặn\n\n` +
               `⚠️ **Lưu ý:** Chỉ Owner mới có thể quản lý nhóm!`;
    }

    /**
     * Validate user ID format
     */
    isValidUserID(userID) {
        return /^\d{10,20}$/.test(userID);
    }

    /**
     * Validate thread ID format
     */
    isValidThreadID(threadID) {
        return /^\d{10,20}(_\d{10,20})*$/.test(threadID);
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
