class InfoPlugin {
    constructor(api, config, authManager, logger) {
        this.api = api;
        this.config = config;
        this.auth = authManager;
        this.logger = logger;
        this.name = 'Info Plugin';
        this.version = '1.1.0';
        this.startTime = Date.now();
    }

    async initialize() {
        // Plugin initialized silently
    }

    async cleanup() {
        // Plugin cleaned up silently
    }

    registerCommands(commandHandler) {
        commandHandler.registerCommand('info', this.command.bind(this), {
            description: 'Thông tin theo cấp bậc và tra cứu người dùng/nhóm',
            usage: '!info | !info @user | !info <userID|threadID>',
            example: '!info | !info @NTV | !info 1234567890123456',
            category: 'Thông tin',
            cooldown: Number(process.env.COMMAND_COOLDOWN || 3) || 3,
            minRole: 0
        });
    }

    async command(event, args) {
        try {
            const { threadID, senderID, mentions = {} } = event;
            const role = this.auth ? this.auth.getUserRole(senderID) : 0;

            // Mentioned user info (restricted to MOD/ADMIN/OWNER)
            const mentionIDs = Object.keys(mentions || {});
            if (mentionIDs.length > 0) {
                if (role < 1) {
                    return this.api.sendMessage('❌ User không được dùng dạng "!info @tag"', threadID);
                }
                const targetID = mentionIDs[0];
                return await this.showUserInThreadInfo(threadID, targetID);
            }

            // If argument exists and is an ID: show user or thread info (MOD+)
            if (args && args.length > 0) {
                if (role < 1) {
                    return this.api.sendMessage('❌ Bạn không có quyền dùng tham số cho !info', threadID);
                }
                const idArg = args[0];
                // Try as threadID first
                const asThread = await this.tryShowThreadAdmins(idArg, threadID);
                if (asThread) return;
                // Fallback as userID
                return await this.showUserBasicInfo(idArg, threadID);
            }

            // No args: role-based info
            if (role === 0) return await this.showUserLevelInfo(event);
            if (role === 1) return await this.showModeratorLevelInfo(event);
            // Admin and Owner
            return await this.showAdminLevelInfo(event);
        } catch (error) {
            this.logger?.logError?.(error, 'info command failed');
            try { await this.api.sendMessage('❌ Lỗi khi xử lý lệnh info', event.threadID); } catch {}
        }
    }

    // USER: Show group moderators(admins) and current box info
    async showUserLevelInfo(event) {
        const { threadID, senderID } = event;
        try {
            const info = await this.api.getThreadInfo(threadID);
            const senderMap = await this.getUserInfo(senderID);
            const senderName = senderMap?.[senderID]?.name || 'Bạn';
            const threadName = info?.threadName || 'Không rõ';
            const admins = this.normalizeAdminIDs(info);
            const adminNames = await this.fetchUserNames(admins);
            const roleName = this.getRoleName(this.auth?.getUserRole(senderID) ?? 0);

            const text = `📦 Thông tin box
• Tên: ${senderName}
• Tên box: ${threadName}
• Quyền của bạn: ${roleName}

🛡️ Moderator/Admin box:
${adminNames.length ? adminNames.map((u,i)=>`${i+1}. ${u.name} (${u.id})`).join('\n') : 'Không có dữ liệu'}`;
            await this.api.sendMessage(text, threadID);
        } catch (e) {
            await this.api.sendMessage('❌ Không lấy được thông tin nhóm hiện tại', threadID);
        }
    }

    // MODERATOR: Show global admins (name, role) and project BOT_NAME
    async showModeratorLevelInfo(event) {
        const { threadID } = event;
        try {
            const admins = this.auth?.getAdmins?.() || [];
            const owners = this.auth?.getOwners?.() || [];
            const ids = Array.from(new Set([...admins, ...owners]));
            const names = await this.fetchUserNames(ids);
            const botName = (this.config?.botName || this.config?.name || process.env.BOT_NAME || 'ConvoX');

            const text = `🧭 Dự án: ${botName}
👑 Admins/Owners:
${names.length ? names.map((u,i)=>`${i+1}. ${u.name} — ${owners.includes(u.id)?'Owner':'Admin'} (${u.id})`).join('\n') : 'Không có dữ liệu'}`;
            await this.api.sendMessage(text, threadID);
        } catch (e) {
            await this.api.sendMessage('❌ Không lấy được danh sách Admin/Owner', threadID);
        }
    }

    // ADMIN/OWNER: Show owners and project/version/description
    async showAdminLevelInfo(event) {
        const { threadID } = event;
        try {
            const owners = this.auth?.getOwners?.() || [];
            const names = await this.fetchUserNames(owners);
            const botName = process.env.BOT_NAME || this.config?.botName || 'ConvoX';
            const version = process.env.BOT_VERSION || this.config?.version || '1.0.0';
            const desc = process.env.BOT_DESCRIPTION || this.config?.description || '—';

            const text = `🧭 Dự án: ${botName}
🔢 Phiên bản: ${version}
📝 Mô tả: ${desc}

👑 Owner(s):
${names.length ? names.map((u,i)=>`${i+1}. ${u.name} — Owner (${u.id})`).join('\n') : 'Không có dữ liệu'}`;
            await this.api.sendMessage(text, threadID);
        } catch (e) {
            await this.api.sendMessage('❌ Không lấy được thông tin Owner', threadID);
        }
    }

    // Mentioned user in current thread: show detailed info (name, joinedAt, addedBy)
    async showUserInThreadInfo(threadID, userID) {
        try {
            const [userMap, thread] = await Promise.all([
                this.getUserInfo(userID),
                this.api.getThreadInfo(threadID)
            ]);
            const user = userMap[userID] || {};
            const name = user?.name || 'Không rõ';
            // fca doesn't reliably expose join time/addedBy -> best-effort placeholders
            const joinedAt = 'Không rõ';
            const addedBy = 'Không rõ';

            const text = `👤 Thông tin thành viên
• Tên: ${name} (${userID})
• Ngày tham gia: ${joinedAt}
• Được bắt cóc bởi: ${addedBy}`;
            await this.api.sendMessage(text, threadID);
        } catch (e) {
            await this.api.sendMessage('❌ Không lấy được thông tin người dùng trong nhóm', threadID);
        }
    }

    // Try to show thread admins if idArg is a thread ID
    async tryShowThreadAdmins(idArg, replyThreadID) {
        try {
            const info = await this.api.getThreadInfo(idArg);
            if (!info) return false;
            const threadName = info?.threadName || 'Không rõ';
            const admins = this.normalizeAdminIDs(info);
            const adminNames = await this.fetchUserNames(admins);
            const ownerId = admins[0] || 'Không rõ';

            const text = `🧵 Thông tin nhóm (${idArg})
• Tên nhóm: ${threadName}
• Chủ/Quản trị: ${ownerId}
• Admins:
${adminNames.length ? adminNames.map((u,i)=>`${i+1}. ${u.name} (${u.id})`).join('\n') : 'Không có dữ liệu'}`;
            await this.api.sendMessage(text, replyThreadID);
            return true;
        } catch {
            return false;
        }
    }

    async showUserBasicInfo(userID, replyThreadID) {
        try {
            const map = await this.getUserInfo(userID);
            const user = map[userID];
            if (!user) throw new Error('not found');
            const text = `👤 Người dùng
• Tên: ${user.name || 'Không rõ'}
• ID: ${userID}`;
            await this.api.sendMessage(text, replyThreadID);
        } catch (e) {
            await this.api.sendMessage('❌ Không tìm thấy người dùng hoặc không đủ quyền', replyThreadID);
        }
    }

    normalizeAdminIDs(info) {
        const raw = info?.adminIDs || info?.threadAdminIDs || [];
        // raw can be array of strings or array of objects with id/userFbId
        return (raw || []).map(x =>
            typeof x === 'string' ? x : (x.id || x.userFbId || x.userID || x.userId)
        ).filter(Boolean);
    }

    async fetchUserNames(uids) {
        if (!uids || uids.length === 0) return [];
        const map = await this.getUserInfo(uids);
        return uids
            .filter(id => map[id])
            .map(id => ({ id, name: map[id].name || id }));
    }

    getUserInfo(userIDs) {
        return new Promise((resolve, reject) => {
            this.api.getUserInfo(Array.isArray(userIDs) ? userIDs : [userIDs], (err, ret) => {
                if (err) return reject(err);
                resolve(ret || {});
            });
        });
    }

    getRoleName(level) {
        return {
            0: 'User',
            1: 'Moderator',
            2: 'Admin',
            3: 'Owner'
        }[level] || 'User';
    }

    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: 'Displays role-based information and lookups'
        };
    }
}

module.exports = InfoPlugin;
