const fs = require('fs-extra');
const path = require('path');

/**
 * Authentication and Permission Management System
 * Quản lý phân quyền user/mod/admin/owner
 */
class AuthManager {
    constructor(logger = null) {
    this.permissions = {
            USER: 0,    // Người dùng thường
            MOD: 1,     // Moderator
            ADMIN: 2,   // Admin
            OWNER: 3    // Owner (cao nhất)
        };
        this.logger = logger;
        
    this.adminUids = [];
    this.ownerUids = [];
    // Global moderators (legacy/global scope)
    this.moderators = new Set();
    // Group-scoped moderators: { [threadID]: Set<userID> }
    this.groupModerators = {};
    this.allowedUsers = new Set(); // Danh sách user được phê duyệt sử dụng bot ở mọi nơi
        this.permissionsFile = './config/permissions.json';
        
        // Group management
        this.allowedGroups = new Set();  // Danh sách nhóm được phép
        this.blockedGroups = new Set();  // Danh sách nhóm bị cấm
        this.groupMode = 'whitelist';    // 'whitelist' hoặc 'blacklist'
    this.pendingGroups = {};         // { [threadID]: { name, owner, firstSeenAt } }
    // Map notification messageID -> threadID to allow reply-based approval by admins
    this.approvalRefs = {};       // { [messageID]: threadID }
        
        this.loadPermissions();
    }

    /**
     * Load admin UIDs from environment and moderators from file
     */
    loadPermissions() {
        try {
            // Load owner/admin UIDs from environment
            const ownerUidsEnv = process.env.OWNER_UIDS || '';
            const adminUidsEnv = process.env.ADMIN_UIDS || '';

            this.ownerUids = ownerUidsEnv
                .split(/[,\s]+/)
                .map(uid => uid.trim())
                .filter(uid => uid && !isNaN(uid));

            // Backward compatibility: if OWNER_UIDS not set, treat ADMIN_UIDS as owners
            if (this.ownerUids.length === 0 && adminUidsEnv) {
                this.ownerUids = adminUidsEnv
                    .split(/[\,\s]+/)
                    .map(uid => uid.trim())
                    .filter(uid => uid && !isNaN(uid));
            }

            this.adminUids = adminUidsEnv
                .split(/[\,\s]+/)
                .map(uid => uid.trim())
                .filter(uid => uid && !isNaN(uid));

            if (this.logger) this.logger.info(`🔐 Loaded ${this.ownerUids.length} owners, ${this.adminUids.length} admins from environment`);
            else console.log(`🔐 Loaded ${this.ownerUids.length} owners, ${this.adminUids.length} admins from environment`);

            // Load moderators and group settings from permissions file
            this.loadModeratorsFromFile();
            this.loadGroupSettingsFromFile();
            
        } catch (error) {
            if (this.logger) this.logger.logError(error, 'Failed to load permissions');
            else console.error('❌ Failed to load permissions:', error);
        }
    }

    /**
     * Load moderators from permissions.json file
     */
    async loadModeratorsFromFile() {
        try {
            if (await fs.pathExists(this.permissionsFile)) {
                const data = await fs.readJson(this.permissionsFile);
                this.moderators = new Set(data.moderators || []);
                // Load group-scoped moderators
                const gm = data.groupModerators || {};
                this.groupModerators = Object.fromEntries(
                    Object.entries(gm).map(([tid, arr]) => [tid, new Set(arr || [])])
                );
                this.allowedUsers = new Set(data.allowedUsers || []);
                this.pendingGroups = data.pendingGroups || {};
                this.approvalRefs = data.approvalRefs || {};
                if (this.logger) this.logger.info(`👮 Loaded ${this.moderators.size} moderators from file`);
                else console.log(`👮 Loaded ${this.moderators.size} moderators from file`);
                if (this.logger) this.logger.info(`✅ Loaded ${this.allowedUsers.size} approved users from file`);
                else console.log(`✅ Loaded ${this.allowedUsers.size} approved users from file`);
            } else {
                // Create default permissions file
                await this.saveModeratorsToFile();
            }
        } catch (error) {
            if (this.logger) this.logger.logError(error, 'Failed to load moderators');
            else console.error('❌ Failed to load moderators:', error);
            this.moderators = new Set();
            this.groupModerators = {};
            this.allowedUsers = new Set();
            this.pendingGroups = {};
            this.approvalRefs = {};
        }
    }

    /**
     * Load group settings from permissions.json file
     */
    async loadGroupSettingsFromFile() {
        try {
            if (await fs.pathExists(this.permissionsFile)) {
                const data = await fs.readJson(this.permissionsFile);
                
                // Load group settings
                this.allowedGroups = new Set(data.allowedGroups || []);
                this.blockedGroups = new Set(data.blockedGroups || []);
                this.groupMode = data.groupMode || 'whitelist';
                this.approvalRefs = data.approvalRefs || this.approvalRefs || {};
                // Ensure groupModerators loaded if present
                if (data.groupModerators && !Object.keys(this.groupModerators || {}).length) {
                    const gm = data.groupModerators || {};
                    this.groupModerators = Object.fromEntries(
                        Object.entries(gm).map(([tid, arr]) => [tid, new Set(arr || [])])
                    );
                }
                
                if (this.logger) {
                    this.logger.info(`🏠 Loaded group settings: ${this.groupMode} mode`);
                    this.logger.info(`✅ Allowed groups: ${this.allowedGroups.size}`);
                    this.logger.info(`❌ Blocked groups: ${this.blockedGroups.size}`);
                } else {
                    console.log(`🏠 Loaded group settings: ${this.groupMode} mode`);
                    console.log(`✅ Allowed groups: ${this.allowedGroups.size}`);
                    console.log(`❌ Blocked groups: ${this.blockedGroups.size}`);
                }
            } else {
                // Create default permissions file with group settings
                await this.saveModeratorsToFile();
            }
        } catch (error) {
            if (this.logger) this.logger.logError(error, 'Failed to load group settings');
            else console.error('❌ Failed to load group settings:', error);
            this.allowedGroups = new Set();
            this.blockedGroups = new Set();
            this.groupMode = 'whitelist';
            this.approvalRefs = {};
        }
    }

    /**
     * Save moderators to permissions.json file
     */
    async saveModeratorsToFile() {
        try {
            const data = {
                moderators: Array.from(this.moderators),
                groupModerators: Object.fromEntries(Object.entries(this.groupModerators).map(([tid, set]) => [tid, Array.from(set)])),
                allowedUsers: Array.from(this.allowedUsers),
                allowedGroups: Array.from(this.allowedGroups),
                blockedGroups: Array.from(this.blockedGroups),
                groupMode: this.groupMode,
                pendingGroups: this.pendingGroups,
                approvalRefs: this.approvalRefs,
                lastUpdated: new Date().toISOString()
            };
            
            await fs.ensureDir(path.dirname(this.permissionsFile));
            await fs.writeJson(this.permissionsFile, data, { spaces: 2 });
            if (this.logger) this.logger.info('💾 Permissions and group settings saved to file');
            else console.log('💾 Permissions and group settings saved to file');
        } catch (error) {
            console.error('❌ Failed to save permissions:', error);
        }
    }

    /**
     * Get user role level
     * @param {string} userID - User ID to check
     * @returns {number} Role level (0=USER, 1=MOD, 2=ADMIN, 3=OWNER)
     */
    getUserRole(userID, threadID = null) {
        if (!userID) return this.permissions.USER;
        
    // Check if owner (from environment)
    if (this.ownerUids.includes(userID)) return this.permissions.OWNER;
    // Check if admin (from environment)
    if (this.adminUids.includes(userID)) return this.permissions.ADMIN;
        
        // Check if moderator
        // 1) Global moderator (legacy)
        if (this.moderators.has(userID)) return this.permissions.MOD;
        // 2) Group-scoped moderator (when threadID provided)
        if (threadID && this.groupModerators[threadID]?.has(userID)) return this.permissions.MOD;
        
        return this.permissions.USER;
    }

    /**
     * Get user role name
     * @param {string} userID - User ID to check
     * @returns {string} Role name
     */
    getUserRoleName(userID, threadID = null) {
        const role = this.getUserRole(userID, threadID);
        const roleNames = {
            [this.permissions.USER]: 'User',
            [this.permissions.MOD]: 'Moderator',
            [this.permissions.ADMIN]: 'Admin',
            [this.permissions.OWNER]: 'Owner'
        };
        return roleNames[role] || 'User';
    }

    /**
     * Check if user has minimum required role
     * @param {string} userID - User ID to check
     * @param {number} minRole - Minimum required role level
     * @returns {boolean} True if user has required role or higher
     */
    hasPermission(userID, minRole, threadID = null) {
        const userRole = this.getUserRole(userID, threadID);
        return userRole >= minRole;
    }

    /**
     * Check if user is owner
     * @param {string} userID - User ID to check
     * @returns {boolean} True if user is owner
     */
    isOwner(userID) {
        return this.getUserRole(userID) === this.permissions.OWNER;
    }

    /**
     * Check if user is admin or owner
     * @param {string} userID - User ID to check
     * @returns {boolean} True if user is admin or owner
     */
    isAdmin(userID) {
    return this.getUserRole(userID) >= this.permissions.ADMIN;
    }

    /**
     * Check if user is moderator or higher
     * @param {string} userID - User ID to check
     * @returns {boolean} True if user is moderator or higher
     */
    isModerator(userID, threadID = null) {
        return this.getUserRole(userID, threadID) >= this.permissions.MOD;
    }

    /**
     * Check if user is explicitly approved
     * @param {string} userID
     * @returns {boolean}
     */
    isUserApproved(userID) {
        return this.allowedUsers.has(userID);
    }

    /**
     * Check if user has access to use the bot in a context
     * - Moderator trở lên: dùng mọi nơi
     * - User được phê duyệt: dùng mọi nơi
     * - User thường: chỉ dùng trong box đã phê duyệt (whitelist) hoặc không bị chặn (blacklist)
     */
    hasAccess(userID, threadID) {
        if (this.isModerator(userID, threadID) || this.isAdmin(userID) || this.isOwner(userID)) return true;
        if (this.isUserApproved(userID)) return true;
        // For regular users, require approved group based on mode
        if (threadID) {
            return this.isGroupAllowed(threadID);
        }
        return false;
    }

    /**
     * Grant moderator role to user (only owners can do this)
     * @param {string} granterID - ID of user granting permission
     * @param {string} targetID - ID of user to grant permission to
     * @returns {boolean} True if successful
     */
    async grantModerator(granterID, targetID) {
        if (!this.isOwner(granterID)) {
            return false;
        }
        
        this.moderators.add(targetID);
        await this.saveModeratorsToFile();
    if (this.logger) this.logger.info(`👮 Moderator role granted to ${targetID} by ${granterID}`);
    else console.log(`👮 Moderator role granted to ${targetID} by ${granterID}`);
        return true;
    }

    /**
     * System-level grant moderator without permission checks
     * Intended for automated flows (e.g., after group approval)
     */
    async grantModeratorSystem(targetID, context = 'system') {
        if (!targetID) return false;
        this.moderators.add(targetID);
        await this.saveModeratorsToFile();
        if (this.logger) this.logger.info(`👮 Moderator role granted to ${targetID} by ${context}`);
        else console.log(`👮 Moderator role granted to ${targetID} by ${context}`);
        return true;
    }

    /**
     * Revoke moderator role from user (only owners can do this)
     * @param {string} granterID - ID of user revoking permission
     * @param {string} targetID - ID of user to revoke permission from
     * @returns {boolean} True if successful
     */
    async revokeModerator(granterID, targetID) {
    if (!this.isOwner(granterID)) {
            return false;
        }
        
        this.moderators.delete(targetID);
        await this.saveModeratorsToFile();
    if (this.logger) this.logger.info(`👮 Moderator role revoked from ${targetID} by ${granterID}`);
    else console.log(`👮 Moderator role revoked from ${targetID} by ${granterID}`);
        return true;
    }

    /** Group-scoped moderator management (Admin+ or current group Moderator) */
    async grantGroupModerator(granterID, targetID, threadID) {
        if (!targetID || !threadID) return false;
        // Only allow if group is allowed and granter is Admin/Owner or Moderator of that group
        if (!this.isGroupAllowed(threadID)) return false;
        if (!(this.isOwner(granterID) || this.isAdmin(granterID) || this.isModerator(granterID, threadID))) return false;
        // Do not override Admin/Owner
        if (this.isAdmin(targetID) || this.isOwner(targetID)) return false;
        if (!this.groupModerators[threadID]) this.groupModerators[threadID] = new Set();
        this.groupModerators[threadID].add(targetID);
        await this.saveModeratorsToFile();
        if (this.logger) this.logger.info(`👮 Group-Moderator granted: ${targetID} in ${threadID} by ${granterID}`);
        else console.log(`👮 Group-Moderator granted: ${targetID} in ${threadID} by ${granterID}`);
        return true;
    }

    async revokeGroupModerator(granterID, targetID, threadID) {
        if (!targetID || !threadID) return false;
        if (!(this.isOwner(granterID) || this.isAdmin(granterID) || this.isModerator(granterID, threadID))) return false;
        const set = this.groupModerators[threadID];
        if (!set) return false;
        set.delete(targetID);
        await this.saveModeratorsToFile();
        if (this.logger) this.logger.info(`👮 Group-Moderator revoked: ${targetID} in ${threadID} by ${granterID}`);
        else console.log(`👮 Group-Moderator revoked: ${targetID} in ${threadID} by ${granterID}`);
        return true;
    }

    getGroupModerators(threadID) {
        return Array.from(this.groupModerators[threadID] || []);
    }

    /**
     * Get list of moderators
     * @returns {Array} Array of moderator UIDs
     */
    getModerators() {
        return Array.from(this.moderators);
    }

    /**
     * Get list of admins/owners
     * @returns {Array} Array of admin/owner UIDs
     */
    getAdmins() {
        // Trả về cả admin và owner để tiện gửi thông báo
        return Array.from(new Set([ ...this.adminUids, ...this.ownerUids ]));
    }

    getOwners() {
        return [...this.ownerUids];
    }

    /**
     * Get user info with role
     * @param {string} userID - User ID to get info for
     * @returns {Object} User info object
     */
    getUserInfo(userID) {
        return {
            userID,
            role: this.getUserRole(userID),
            roleName: this.getUserRoleName(userID),
            isOwner: this.isOwner(userID),
            isAdmin: this.isAdmin(userID),
            isModerator: this.isModerator(userID)
        };
    }

    /**
     * Reload permissions from environment and file
     */
    async reloadPermissions() {
    this.loadPermissions();
    if (this.logger) this.logger.info('🔄 Permissions reloaded');
    else console.log('🔄 Permissions reloaded');
    }

    /**
     * Get permission statistics
     * @returns {Object} Permission stats
     */
    getStats() {
        return {
            totalAdmins: this.adminUids.length,
            totalOwners: this.ownerUids.length,
            totalModerators: this.moderators.size,
            totalApprovedUsers: this.allowedUsers.size,
            totalAllowedGroups: this.allowedGroups.size,
            totalBlockedGroups: this.blockedGroups.size,
            totalPendingGroups: Object.keys(this.pendingGroups).length,
            groupMode: this.groupMode,
            permissionsFile: this.permissionsFile,
            lastUpdated: new Date().toISOString()
        };
    }

    // ==================== GROUP MANAGEMENT METHODS ====================

    /**
     * Check if group is allowed to use bot
     * @param {string} threadID - Thread/Group ID to check
     * @returns {boolean} True if group is allowed
     */
    isGroupAllowed(threadID) {
        if (!threadID) return false;
        
        // If whitelist mode: only allowed groups can use bot
        if (this.groupMode === 'whitelist') {
            return this.allowedGroups.has(threadID);
        }
        
        // If blacklist mode: all groups except blocked ones can use bot
        if (this.groupMode === 'blacklist') {
            return !this.blockedGroups.has(threadID);
        }
        
        // Default: allow all groups
        return true;
    }

    /**
     * Add group to allowed list (whitelist mode)
     * @param {string} granterID - ID of user granting permission
     * @param {string} threadID - Thread/Group ID to add
     * @returns {boolean} True if successful
     */
    async allowGroup(granterID, threadID) {
    if (!(this.isAdmin(granterID) || this.isOwner(granterID))) {
            return false;
        }
        
        this.allowedGroups.add(threadID);
        this.blockedGroups.delete(threadID); // Remove from blacklist if exists
    delete this.pendingGroups[threadID];
        await this.saveModeratorsToFile();
    if (this.logger) this.logger.info(`✅ Group ${threadID} added to allowed list by ${granterID}`);
    else console.log(`✅ Group ${threadID} added to allowed list by ${granterID}`);
        return true;
    }

    /**
     * Remove group from allowed list
     * @param {string} granterID - ID of user removing permission
     * @param {string} threadID - Thread/Group ID to remove
     * @returns {boolean} True if successful
     */
    async disallowGroup(granterID, threadID) {
    if (!(this.isAdmin(granterID) || this.isOwner(granterID))) {
            return false;
        }
        
        this.allowedGroups.delete(threadID);
    // Keep pending as-is; optional: mark pending again
        await this.saveModeratorsToFile();
    if (this.logger) this.logger.info(`❌ Group ${threadID} removed from allowed list by ${granterID}`);
    else console.log(`❌ Group ${threadID} removed from allowed list by ${granterID}`);
        return true;
    }

    /**
     * Add group to blocked list (blacklist mode)
     * @param {string} granterID - ID of user blocking
     * @param {string} threadID - Thread/Group ID to block
     * @returns {boolean} True if successful
     */
    async blockGroup(granterID, threadID) {
    if (!(this.isAdmin(granterID) || this.isOwner(granterID))) {
            return false;
        }
        
        this.blockedGroups.add(threadID);
        this.allowedGroups.delete(threadID); // Remove from whitelist if exists
    delete this.pendingGroups[threadID];
        await this.saveModeratorsToFile();
    if (this.logger) this.logger.info(`🚫 Group ${threadID} added to blocked list by ${granterID}`);
    else console.log(`🚫 Group ${threadID} added to blocked list by ${granterID}`);
        return true;
    }

    /**
     * Remove group from blocked list
     * @param {string} granterID - ID of user unblocking
     * @param {string} threadID - Thread/Group ID to unblock
     * @returns {boolean} True if successful
     */
    async unblockGroup(granterID, threadID) {
    if (!(this.isAdmin(granterID) || this.isOwner(granterID))) {
            return false;
        }
        
        this.blockedGroups.delete(threadID);
        await this.saveModeratorsToFile();
    if (this.logger) this.logger.info(`✅ Group ${threadID} removed from blocked list by ${granterID}`);
    else console.log(`✅ Group ${threadID} removed from blocked list by ${granterID}`);
        return true;
    }

    /**
     * Set group management mode
     * @param {string} granterID - ID of user changing mode
     * @param {string} mode - 'whitelist' or 'blacklist'
     * @returns {boolean} True if successful
     */
    async setGroupMode(granterID, mode) {
        if (!this.isOwner(granterID)) {
            return false;
        }
        
        if (mode !== 'whitelist' && mode !== 'blacklist') {
            return false;
        }
        
        this.groupMode = mode;
        await this.saveModeratorsToFile();
    if (this.logger) this.logger.info(`🔄 Group mode changed to ${mode} by ${granterID}`);
    else console.log(`🔄 Group mode changed to ${mode} by ${granterID}`);
        return true;
    }

    /**
     * Get list of allowed groups
     * @returns {Array} Array of allowed group IDs
     */
    getAllowedGroups() {
        return Array.from(this.allowedGroups);
    }

    /**
     * Get list of blocked groups
     * @returns {Array} Array of blocked group IDs
     */
    getBlockedGroups() {
        return Array.from(this.blockedGroups);
    }

    /**
     * Get current group mode
     * @returns {string} Current group mode ('whitelist' or 'blacklist')
     */
    getGroupMode() {
        return this.groupMode;
    }

    /**
     * Clear all group settings
     * @param {string} granterID - ID of user clearing settings
     * @returns {boolean} True if successful
     */
    async clearGroupSettings(granterID) {
        if (!this.isOwner(granterID)) {
            return false;
        }
        
        this.allowedGroups.clear();
        this.blockedGroups.clear();
        this.groupMode = 'whitelist';
        await this.saveModeratorsToFile();
    if (this.logger) this.logger.info(`🗑️ All group settings cleared by ${granterID}`);
    else console.log(`🗑️ All group settings cleared by ${granterID}`);
        return true;
    }

    // ==================== USER APPROVAL METHODS ====================

    /**
     * Approve a user to use bot anywhere (Admin+)
     */
    async allowUser(granterID, userID) {
        if (!(this.isAdmin(granterID) || this.isOwner(granterID))) return false;
        this.allowedUsers.add(userID);
        await this.saveModeratorsToFile();
        if (this.logger) this.logger.info(`✅ User ${userID} approved by ${granterID}`);
        else console.log(`✅ User ${userID} approved by ${granterID}`);
        return true;
    }

    /**
     * Revoke a user's approval (Admin+)
     */
    async disallowUser(granterID, userID) {
        if (!(this.isAdmin(granterID) || this.isOwner(granterID))) return false;
        this.allowedUsers.delete(userID);
        await this.saveModeratorsToFile();
        if (this.logger) this.logger.info(`❌ User ${userID} approval revoked by ${granterID}`);
        else console.log(`❌ User ${userID} approval revoked by ${granterID}`);
        return true;
    }

    getApprovedUsers() {
        return Array.from(this.allowedUsers);
    }

    // ==================== PENDING GROUPS ====================

    /**
     * Record a pending group (bot added but not approved yet)
     */
    async recordPendingGroup(threadID, meta = {}) {
        if (!threadID) return false;
        // Do not record if already allowed or blocked
        if (this.allowedGroups.has(threadID) || this.blockedGroups.has(threadID)) return false;
        const entry = this.pendingGroups[threadID] || {};
        this.pendingGroups[threadID] = {
            name: meta.name ?? entry.name ?? '',
            owner: meta.owner ?? entry.owner ?? '',
            firstSeenAt: entry.firstSeenAt || new Date().toISOString()
        };
        await this.saveModeratorsToFile();
        return true;
    }

    async removePendingGroup(threadID) {
        if (!threadID) return false;
        if (this.pendingGroups[threadID]) {
            delete this.pendingGroups[threadID];
            await this.saveModeratorsToFile();
            return true;
        }
        return false;
    }

    getPendingGroups() {
        return Object.entries(this.pendingGroups).map(([threadID, v]) => ({ threadID, ...v }));
    }

    // ==================== APPROVAL REPLY REFERENCES ====================

    /**
     * Record a mapping from notification messageID -> target threadID for quick reply approvals
     */
    async recordApprovalRef(messageID, threadID) {
        if (!messageID || !threadID) return false;
        this.approvalRefs[messageID] = threadID;
        await this.saveModeratorsToFile();
        return true;
    }

    /**
     * Resolve threadID from a replied message ID
     */
    getThreadIdFromApprovalRef(messageID) {
        if (!messageID) return null;
        return this.approvalRefs[messageID] || null;
    }

    /**
     * Remove approval reference after use
     */
    async removeApprovalRef(messageID) {
        if (!messageID) return false;
        if (this.approvalRefs[messageID]) {
            delete this.approvalRefs[messageID];
            await this.saveModeratorsToFile();
            return true;
        }
        return false;
    }
}

module.exports = AuthManager;
