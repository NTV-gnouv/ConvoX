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
            minRole: 2, // Admin trở lên
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

        // ==================== USER APPROVAL COMMANDS (Admin+) ====================

        commandHandler.registerCommand('user', this.handleUserApproval.bind(this), {
            description: 'Quản lý phê duyệt người dùng (Admin+)',
            usage: '!user <allow|disallow|list> <userID>',
            example: '!user allow 1000123456789',
            category: 'admin',
            minRole: 2,
            aliases: ['approve', 'uia']
        });

        // ==================== GROUP LISTING COMMANDS (Admin+) ====================

        commandHandler.registerCommand('grouprun', this.handleGroupRun.bind(this), {
            description: 'Danh sách box đã duyệt (Admin+)',
            usage: '!grouprun',
            example: '!grouprun',
            category: 'admin',
            minRole: 2
        });

        commandHandler.registerCommand('groupwait', this.handleGroupWait.bind(this), {
            description: 'Danh sách box đang chờ phê duyệt (Admin+)',
            usage: '!groupwait',
            example: '!groupwait',
            category: 'admin',
            minRole: 2
        });

        // ===== System admin commands (merged from systemadmin plugin) =====
        commandHandler.registerCommand('restart', this.handleRestart.bind(this), {
            description: 'Khởi động lại bot (chỉ Owner)',
            usage: '!restart',
            example: '!restart',
            category: 'admin',
            minRole: 3
        });

        commandHandler.registerCommand('shutdown', this.handleShutdown.bind(this), {
            description: 'Tắt bot (chỉ Owner)',
            usage: '!shutdown',
            example: '!shutdown',
            category: 'admin',
            minRole: 3
        });

        commandHandler.registerCommand('reload', this.handleReloadConfig.bind(this), {
            description: 'Tải lại cấu hình/phân quyền',
            usage: '!reload',
            example: '!reload',
            category: 'admin',
            minRole: 2
        });

        commandHandler.registerCommand('ban', this.handleBan.bind(this), {
            description: 'Cấm người dùng (Moderator+)',
            usage: '!ban <userID> [reason]',
            example: '!ban 1000123456789 Spam',
            category: 'moderation',
            minRole: 1
        });

        commandHandler.registerCommand('unban', this.handleUnban.bind(this), {
            description: 'Bỏ cấm người dùng (Moderator+)',
            usage: '!unban <userID>',
            example: '!unban 1000123456789',
            category: 'moderation',
            minRole: 1
        });

        commandHandler.registerCommand('kick', this.handleKick.bind(this), {
            description: 'Đuổi người dùng khỏi nhóm (Moderator+, bot cần quyền admin trong box)',
            usage: '!kick <userID> [reason]',
            example: '!kick 1000123456789 Vi phạm nội quy',
            category: 'moderation',
            minRole: 1
        });

        // Group-scoped moderator management
        commandHandler.registerCommand('mod', this.handleModCommand.bind(this), {
            description: 'Quản lý Moderator theo từng box đã duyệt (Admin/Mod của box)',
            usage: '!mod <add|rm|list> [userID|@tag]',
            example: '!mod add 1000123456789',
            category: 'moderation',
            minRole: 1 // Moderator (of current box) or Admin/Owner
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
        const owners = this.authManager.getOwners ? this.authManager.getOwners() : [];
        const moderators = this.authManager.getModerators();
        const approvedUsers = this.authManager.getApprovedUsers ? this.authManager.getApprovedUsers() : [];
        
        let message = '📋 Danh sách phân quyền:\n\n';
        
        message += `👑 Owners (${owners.length}):\n`;
        message += owners.length ? owners.map(uid => `• ${uid}`).join('\n') : '• Chưa có';
        message += '\n\n';

        // Admins (không trùng owners)
        const pureAdmins = admins.filter(uid => !owners.includes(uid));
        message += `🔧 Admins (${pureAdmins.length}):\n`;
        message += pureAdmins.length ? pureAdmins.map(uid => `• ${uid}`).join('\n') : '• Chưa có';
        message += '\n\n';
        
        message += `👮 Moderators (${moderators.length}):\n`;
        if (moderators.length === 0) {
            message += '• Chưa có moderator nào\n';
        } else {
            message += moderators.map(uid => `• ${uid}`).join('\n') + '\n';
        }

        message += `\n✅ Users được phê duyệt (${approvedUsers.length}):\n`;
        message += approvedUsers.length ? approvedUsers.map(uid => `• ${uid}`).join('\n') : '• Chưa có';
        
        await this.sendMessage(threadID, message);
    }

    /**
     * Handle whoami command
     */
    async handleWhoAmI(event) {
        const { senderID, threadID } = event;
        
        const roleLevel = this.authManager.getUserRole(senderID, threadID);
        const roleName = this.authManager.getUserRoleName(senderID, threadID);
        const isModeratorHere = this.authManager.isModerator(senderID, threadID);

        const lines = [
            '👤 Thông tin của bạn:',
            `🆔 User ID: ${senderID}`,
            `🎭 Quyền: ${roleName}`,
            (roleName === 'Moderator' && isModeratorHere) ? '📦 Phạm vi: hiệu lực trong box hiện tại' : ''
        ].filter(Boolean);

        await this.sendMessage(threadID, lines.join('\n'));
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
           `\`!admin grant <userID>\` - Cấp quyền Moderator (toàn hệ thống)\n` +
           `\`!admin revoke <userID>\` - Thu hồi quyền Moderator (toàn hệ thống)\n` +
           `\`!admin list\` - Xem danh sách phân quyền\n` +
           `\`!admin whoami\` - Kiểm tra quyền của bạn\n` +
           `\`!whoami\` - Kiểm tra quyền của bạn\n` +
           `\`!reloadperms\` - Tải lại cấu hình phân quyền\n` +
           `\`!adminstats\` - Xem thống kê phân quyền\n\n` +
           `🏠 **Lệnh quản lý nhóm:**\n` +
           `\`!group allow [threadID]\` - Cho phép nhóm sử dụng bot (có thể reply thông báo)\n` +
           `\`!group block <threadID>\` - Chặn nhóm\n` +
           `\`!group unblock <threadID>\` - Bỏ chặn nhóm\n` +
           `\`!group list\` - Xem danh sách nhóm\n` +
           `\`!group mode <whitelist|blacklist>\` - Đổi chế độ\n` +
           `\`!group clear\` - Xóa tất cả cài đặt nhóm\n` +
           `\`!groupinfo\` - Kiểm tra quyền nhóm hiện tại\n` +
           `\`!grouprun\` - Danh sách box đã duyệt\n` +
           `\`!groupwait\` - Danh sách box đang chờ phê duyệt\n` +
           `\`!mod <add|rm|list> [userID|@tag]\` - Quản lý Moderator của box hiện tại\n\n` +
           `👤 **Lệnh phê duyệt người dùng (Admin+):**\n` +
           `\`!user allow <userID>\` - Phê duyệt người dùng dùng bot ở mọi nơi\n` +
           `\`!user disallow <userID>\` - Gỡ phê duyệt người dùng\n` +
           `\`!user list\` - Danh sách người dùng đã phê duyệt\n\n` +
           `⚠️ **Lưu ý:** Owner có toàn quyền; Admin/Moderator chỉ cấp Moderator trong box được duyệt.`;
    }

    // ============== GROUP-SCOPED MODERATOR COMMAND ==============
    async handleModCommand(event, args) {
        const { senderID, threadID, mentions = {} } = event;
        if (!this.authManager.isGroupAllowed(threadID)) {
            await this.sendMessage(threadID, '❌ Box chưa được duyệt.');
            return;
        }
        if (!args || args.length === 0) {
            await this.sendMessage(threadID, this.getModHelp());
            return;
        }
        const action = args[0].toLowerCase();
        // Resolve target user ID (from arg or mention)
        let targetID = null;
        const mentionIDs = Object.keys(mentions || {});
        if (mentionIDs.length > 0) targetID = mentionIDs[0];
        if (!targetID && args[1]) targetID = args[1];

        if (action === 'list') {
            const mods = this.authManager.getGroupModerators(threadID);
            const msg = mods.length ? `👮 Moderators của box:\n` + mods.map((u,i)=>`${i+1}. ${u}`).join('\n') : '👮 Chưa có Moderator nào trong box.';
            await this.sendMessage(threadID, msg);
            return;
        }

        if (!targetID || !this.isValidUserID(targetID)) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp User ID hợp lệ hoặc @tag.');
            return;
        }

        // Permission: Admin/Owner anywhere OR Moderator of this box
        const canManage = this.authManager.isOwner(senderID) || this.authManager.isAdmin(senderID) || this.authManager.isModerator(senderID, threadID);
        if (!canManage) {
            await this.sendMessage(threadID, '❌ Bạn không có quyền quản lý Moderator của box này.');
            return;
        }

        if (action === 'add') {
            const ok = await this.authManager.grantGroupModerator(senderID, targetID, threadID);
            await this.sendMessage(threadID, ok ? `✅ Đã cấp quyền Moderator cho ${targetID} trong box này.` : '❌ Không thể cấp quyền Moderator.');
            return;
        }
        if (action === 'rm' || action === 'remove' || action === 'revoke') {
            const ok = await this.authManager.revokeGroupModerator(senderID, targetID, threadID);
            await this.sendMessage(threadID, ok ? `✅ Đã gỡ quyền Moderator của ${targetID} trong box này.` : '❌ Không thể gỡ quyền Moderator.');
            return;
        }
        await this.sendMessage(threadID, `❌ Hành động "${action}" không hợp lệ.\n${this.getModHelp()}`);
    }

    getModHelp() {
        return '👮 Lệnh Moderator (theo box):\n' +
               '`!mod add <userID|@tag>` - Cấp quyền Moderator trong box hiện tại\n' +
               '`!mod rm <userID|@tag>` - Gỡ quyền Moderator trong box hiện tại\n' +
               '`!mod list` - Danh sách Moderator của box hiện tại\n' +
               '• Admin/Owner có thể cấp trong mọi box; Moderator chỉ có thể cấp trong box hiện tại.';
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

        // If admin replies to an approval DM with "!group allow", resolve the target from the replied message
        let resolvedTarget = targetThreadID;
        try {
            const replyTo = event?.messageReply || event?.message_replied || event?.messageReplyData;
            const repliedMsgId = replyTo?.messageID || replyTo?.messageId || event?.messageReply?.messageID;
            if (!resolvedTarget && repliedMsgId && typeof this.authManager.getThreadIdFromApprovalRef === 'function') {
                const tidFromRef = this.authManager.getThreadIdFromApprovalRef(repliedMsgId);
                if (tidFromRef) {
                    resolvedTarget = tidFromRef;
                    // consume the ref to avoid reuse
                    try { await this.authManager.removeApprovalRef(repliedMsgId); } catch {}
                }
            }
            // Fallback: parse thread ID from the replied message body content
            if (!resolvedTarget) {
                const repliedBody = replyTo?.body || replyTo?.message || '';
                if (repliedBody) {
                    // Try explicit label
                    let m = repliedBody.match(/Thread ID:\s*(\d{10,20})/i);
                    if (!m) m = repliedBody.match(/\b(\d{10,20})\b/);
                    if (m && m[1]) {
                        resolvedTarget = m[1];
                    }
                }
            }
        } catch {}

        // Determine target thread ID
        let id = resolvedTarget;
        if (!id) {
            // Only default to current thread if it is a group thread
            try {
                const info = await this.api.getThreadInfo(threadID);
                const isGroup = !!(info?.isGroup || (Array.isArray(info?.participantIDs) && info.participantIDs.length > 2));
                if (isGroup) id = threadID;
            } catch {
                // If cannot verify, keep id undefined to force validation fail
            }
        }

        if (!this.isValidThreadID(id)) {
            await this.sendMessage(threadID, '❌ Thread ID không hợp lệ!');
            return;
        }

        const success = await this.authManager.allowGroup(senderID, id);
        
        if (success) {
            // Try to auto-promote the group owner (first admin) to Moderator
            let ownerID = null;
            try {
                const info = await this.api.getThreadInfo(id);
                const adminIDs = info?.adminIDs || info?.threadAdminIDs || [];
                if (Array.isArray(adminIDs) && adminIDs.length > 0) {
                    const first = adminIDs[0];
                    ownerID = typeof first === 'string' ? first : (first.id || first.userFbId || first.userID || first.userId) || null;
                }
            } catch {}
            // Fallback to recorded pending owner
            if (!ownerID) {
                try {
                    const pending = this.authManager.pendingGroups?.[id];
                    if (pending?.owner) ownerID = pending.owner;
                } catch {}
            }

            if (ownerID && !this.authManager.isModerator(ownerID, id) && !this.authManager.isAdmin(ownerID) && !this.authManager.isOwner(ownerID)) {
                try { await this.authManager.grantGroupModerator(senderID, ownerID, id); } catch {}
            }

            await this.sendMessage(threadID, `✅ Đã cho phép nhóm ${id} sử dụng bot` + (ownerID ? `\n👮 Chủ/Quản trị đầu tiên của box (${ownerID}) đã được nâng quyền Moderator.` : ''));
        } else {
            await this.sendMessage(threadID, '❌ Không thể cho phép nhóm này!');
        }
    }

    /**
     * Disallow group from using bot
     */
    async handleDisallowGroup(event, targetThreadID) {
        const { senderID, threadID } = event;

        const id = targetThreadID || threadID; // default to current group

        if (!this.isValidThreadID(id)) {
            await this.sendMessage(threadID, '❌ Thread ID không hợp lệ!');
            return;
        }

        const success = await this.authManager.disallowGroup(senderID, id);
        
        if (success) {
            await this.sendMessage(threadID, `❌ Đã cấm nhóm ${id} sử dụng bot`);
        } else {
            await this.sendMessage(threadID, '❌ Không thể cấm nhóm này!');
        }
    }

    /**
     * Block group
     */
    async handleBlockGroup(event, targetThreadID) {
        const { senderID, threadID } = event;

        const id = targetThreadID || threadID; // default to current group

        if (!this.isValidThreadID(id)) {
            await this.sendMessage(threadID, '❌ Thread ID không hợp lệ!');
            return;
        }

        const success = await this.authManager.blockGroup(senderID, id);
        
        if (success) {
            await this.sendMessage(threadID, `🚫 Đã chặn nhóm ${id}`);
        } else {
            await this.sendMessage(threadID, '❌ Không thể chặn nhóm này!');
        }
    }

    /**
     * Unblock group
     */
    async handleUnblockGroup(event, targetThreadID) {
        const { senderID, threadID } = event;

        const id = targetThreadID || threadID; // default to current group

        if (!this.isValidThreadID(id)) {
            await this.sendMessage(threadID, '❌ Thread ID không hợp lệ!');
            return;
        }

        const success = await this.authManager.unblockGroup(senderID, id);
        
        if (success) {
            await this.sendMessage(threadID, `✅ Đã bỏ chặn nhóm ${id}`);
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
        
        let message = `🏠 **Thông tin nhóm chat:**\n\n`;
        message += `🆔 **Thread ID:** ${threadID}\n`;
        message += `📋 **Chế độ:** ${groupMode === 'whitelist' ? 'Whitelist' : 'Blacklist'}\n`;
        message += `✅ **Trạng thái:** ${isAllowed ? 'Được phép sử dụng bot' : 'Không được phép sử dụng bot'}\n\n`;

        // Chỉ Admin/Owner mới thấy thống kê hệ thống (Moderator/User sẽ không thấy)
        const isAdminOrOwner = this.authManager.isAdmin(senderID) || this.authManager.isOwner(senderID);
        if (isAdminOrOwner) {
            const allowedGroups = this.authManager.getAllowedGroups();
            const blockedGroups = this.authManager.getBlockedGroups();
            message += `📊 **Thống kê (Admin/Owner):**\n`;
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
               `\`!groupinfo\` - Kiểm tra quyền nhóm hiện tại\n` +
               `\`!grouprun\` - Danh sách box đã duyệt\n` +
               `\`!groupwait\` - Danh sách box đang chờ phê duyệt\n\n` +
               `📋 **Chế độ:**\n` +
               `• **Whitelist:** Chỉ nhóm trong danh sách được phép mới có thể sử dụng bot\n` +
               `• **Blacklist:** Tất cả nhóm đều có thể sử dụng bot, trừ những nhóm bị chặn\n\n` +
               `⚠️ **Lưu ý:** Admin trở lên có thể quản lý nhóm!`;
    }

    // ===== System admin handlers (merged) =====

    async handleRestart(event) {
        const { threadID } = event;
        await this.sendMessage(threadID, '🔄 Bot sẽ khởi động lại trong 3 giây...');
        setTimeout(() => process.exit(0), 3000);
    }

    async handleShutdown(event) {
        const { threadID } = event;
        await this.sendMessage(threadID, '🛑 Bot sẽ tắt trong 3 giây...');
        setTimeout(() => process.exit(0), 3000);
    }

    async handleReloadConfig(event) {
        const { threadID } = event;
        try {
            if (this.authManager?.reloadPermissions) await this.authManager.reloadPermissions();
            await this.sendMessage(threadID, '✅ Đã tải lại cấu hình/phân quyền');
        } catch (e) {
            await this.sendMessage(threadID, '❌ Lỗi khi tải lại cấu hình');
        }
    }

    async handleBan(event, args) {
        const { threadID, senderID } = event;
        if (!args || args.length === 0) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp User ID để cấm!');
            return;
        }
        const targetID = args[0];
        const reason = args.slice(1).join(' ') || 'Không có lý do';
        if (!this.isValidUserID(targetID)) {
            await this.sendMessage(threadID, '❌ User ID không hợp lệ!');
            return;
        }
        if (this.authManager.isAdmin?.(targetID)) {
            await this.sendMessage(threadID, '❌ Không thể cấm admin/owner!');
            return;
        }
        // Placeholder: integrate with your ban list if available
        await this.sendMessage(threadID, `🚫 Đã cấm ${targetID}\n📝 Lý do: ${reason}\n👮 Thực hiện bởi: ${senderID}`);
    }

    async handleUnban(event, args) {
        const { threadID, senderID } = event;
        if (!args || args.length === 0) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp User ID để bỏ cấm!');
            return;
        }
        const targetID = args[0];
        if (!this.isValidUserID(targetID)) {
            await this.sendMessage(threadID, '❌ User ID không hợp lệ!');
            return;
        }
        // Placeholder unban
        await this.sendMessage(threadID, `✅ Đã bỏ cấm ${targetID}\n👮 Thực hiện bởi: ${senderID}`);
    }

    async handleKick(event, args) {
        const { threadID, senderID, mentions = {} } = event;
        if ((!args || args.length === 0) && Object.keys(mentions).length === 0) {
            await this.sendMessage(threadID, '❌ Vui lòng @tag hoặc cung cấp User ID để đuổi!');
            return;
        }

        // Resolve target from @tag first, then from the first argument
        const mentionIDs = Object.keys(mentions || {});
        const rawTarget = mentionIDs[0] || args[0] || '';
        const targetID = this.normalizeUserID(rawTarget);
        const reason = (mentionIDs.length > 0 ? args.join(' ') : args.slice(1).join(' ')) || 'Không có lý do';

        if (!this.isValidUserID(targetID)) {
            await this.sendMessage(threadID, '❌ User ID không hợp lệ!');
            return;
        }
        if (this.authManager.isOwner?.(targetID) || this.authManager.isAdmin?.(targetID)) {
            await this.sendMessage(threadID, '❌ Không thể đuổi admin/owner!');
            return;
        }
        // Check bot admin in the box before kicking
        const botIsAdmin = await this.checkBotIsAdmin(threadID);
        if (!botIsAdmin) {
            await this.sendMessage(threadID, '⚠️ Bot cần quyền admin trong box để dùng lệnh này.');
            return;
        }
        try {
            await this.api.removeUserFromGroup(targetID, threadID);
            await this.sendMessage(threadID, `👢 Đã đuổi ${targetID} khỏi nhóm\n📝 Lý do: ${reason}\n👮 Thực hiện bởi: ${senderID}`);
        } catch (error) {
            console.error('❌ Failed to kick user:', error);
            await this.sendMessage(threadID, '❌ Không thể đuổi người dùng này!');
        }
    }

    normalizeUserID(userID) {
        const s = String(userID || '');
        // Strip non-digits (handles formats like fbid:123 or accidental chars)
        const digits = s.replace(/\D/g, '');
        return digits;
    }

    async checkBotIsAdmin(threadID) {
        try {
            const info = await this.api.getThreadInfo(threadID);
            const admins = info?.adminIDs || info?.threadAdminIDs || [];
            const botID = this.api.getCurrentUserID();
            return (admins || []).some(a => (typeof a === 'string' ? a : (a.id || a.userFbId || a.userID || a.userId)) === botID);
        } catch { return false; }
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

    // ============== USER APPROVAL HANDLERS ==============

    async handleUserApproval(event, args) {
        const { senderID, threadID } = event;
        if (args.length === 0) {
            await this.sendMessage(threadID, this.getUserHelp());
            return;
        }
        const action = args[0].toLowerCase();
        const targetID = args[1];

        if (action === 'list') {
            const approved = this.authManager.getApprovedUsers ? this.authManager.getApprovedUsers() : [];
            const msg = `✅ Người dùng được phê duyệt (${approved.length}):\n` + (approved.length ? approved.map(u => `• ${u}`).join('\n') : '• Chưa có');
            await this.sendMessage(threadID, msg);
            return;
        }

        if (!targetID || !this.isValidUserID(targetID)) {
            await this.sendMessage(threadID, '❌ Vui lòng cung cấp User ID hợp lệ!');
            return;
        }

        if (action === 'allow') {
            const ok = await this.authManager.allowUser(senderID, targetID);
            await this.sendMessage(threadID, ok ? `✅ Đã phê duyệt ${targetID} dùng bot ở mọi nơi` : '❌ Không thể phê duyệt người dùng!');
        } else if (action === 'disallow') {
            const ok = await this.authManager.disallowUser(senderID, targetID);
            await this.sendMessage(threadID, ok ? `❌ Đã gỡ phê duyệt ${targetID}` : '❌ Không thể gỡ phê duyệt!');
        } else {
            await this.sendMessage(threadID, `❌ Hành động "${action}" không hợp lệ!\n${this.getUserHelp()}`);
        }
    }

    getUserHelp() {
        return '👤 Lệnh người dùng (Admin+):\n' +
               '`!user allow <userID>` - Phê duyệt người dùng dùng bot ở mọi nơi\n' +
               '`!user disallow <userID>` - Gỡ phê duyệt người dùng\n' +
               '`!user list` - Danh sách người dùng đã phê duyệt';
    }

    // ============== GROUP LISTING HANDLERS ==============

    async handleGroupRun(event) {
        const { threadID } = event;
        try {
            const approved = this.authManager.getAllowedGroups();
            if (!approved || approved.length === 0) {
                await this.sendMessage(threadID, 'Danh sách box đã duyệt\n• Chưa có');
                return;
            }
            // Fetch thread info best-effort
            const rows = await Promise.all(approved.map(async (tid, idx) => {
                let name = '', owner = '';
                try {
                    const info = await this.api.getThreadInfo(tid);
                    name = info?.threadName || '';
                    const adminIDs = info?.adminIDs || info?.threadAdminIDs || [];
                    owner = Array.isArray(adminIDs) && adminIDs.length > 0 ? adminIDs[0] : '';
                } catch {}
                return `${idx + 1}|${tid}|${name || 'N/A'}|${owner || 'N/A'}`;
            }));
            const msg = 'Danh sách box đã duyệt\n' + rows.join('\n');
            await this.sendMessage(threadID, msg);
        } catch (e) {
            await this.sendMessage(threadID, '❌ Không thể lấy danh sách box đã duyệt');
        }
    }

    async handleGroupWait(event) {
        const { threadID } = event;
        try {
            const pendings = this.authManager.getPendingGroups ? this.authManager.getPendingGroups() : [];
            if (!pendings || pendings.length === 0) {
                await this.sendMessage(threadID, 'Danh sách box đang chờ\n• Không có');
                return;
            }
            const rows = pendings.map((g, idx) => `${idx + 1}|${g.threadID}|${g.name || 'N/A'}|${g.owner || 'N/A'}`);
            const msg = 'Danh sách box đang chờ\n' + rows.join('\n');
            await this.sendMessage(threadID, msg);
        } catch (e) {
            await this.sendMessage(threadID, '❌ Không thể lấy danh sách box đang chờ');
        }
    }
}

module.exports = AdminCommands;
