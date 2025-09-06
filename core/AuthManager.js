const fs = require('fs-extra');
const path = require('path');

/**
 * Authentication and Permission Management System
 * Quản lý phân quyền user/mod/admin/owner
 */
class AuthManager {
    constructor() {
        this.permissions = {
            USER: 0,    // Người dùng thường
            MOD: 1,     // Moderator
            ADMIN: 2,   // Admin
            OWNER: 3    // Owner (cao nhất)
        };
        
        this.adminUids = [];
        this.moderators = new Set();
        this.permissionsFile = './config/permissions.json';
        
        // Group management
        this.allowedGroups = new Set();  // Danh sách nhóm được phép
        this.blockedGroups = new Set();  // Danh sách nhóm bị cấm
        this.groupMode = 'whitelist';    // 'whitelist' hoặc 'blacklist'
        
        this.loadPermissions();
    }

    /**
     * Load admin UIDs from environment and moderators from file
     */
    loadPermissions() {
        try {
            // Load admin UIDs from environment
            const adminUidsEnv = process.env.ADMIN_UIDS || '';
            this.adminUids = adminUidsEnv
                .split(/[,\s]+/)
                .map(uid => uid.trim())
                .filter(uid => uid && !isNaN(uid));

            console.log(`🔐 Loaded ${this.adminUids.length} admin UIDs from environment`);

            // Load moderators and group settings from permissions file
            this.loadModeratorsFromFile();
            this.loadGroupSettingsFromFile();
            
        } catch (error) {
            console.error('❌ Failed to load permissions:', error);
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
                console.log(`👮 Loaded ${this.moderators.size} moderators from file`);
            } else {
                // Create default permissions file
                await this.saveModeratorsToFile();
            }
        } catch (error) {
            console.error('❌ Failed to load moderators:', error);
            this.moderators = new Set();
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
                
                console.log(`🏠 Loaded group settings: ${this.groupMode} mode`);
                console.log(`✅ Allowed groups: ${this.allowedGroups.size}`);
                console.log(`❌ Blocked groups: ${this.blockedGroups.size}`);
            } else {
                // Create default permissions file with group settings
                await this.saveModeratorsToFile();
            }
        } catch (error) {
            console.error('❌ Failed to load group settings:', error);
            this.allowedGroups = new Set();
            this.blockedGroups = new Set();
            this.groupMode = 'whitelist';
        }
    }

    /**
     * Save moderators to permissions.json file
     */
    async saveModeratorsToFile() {
        try {
            const data = {
                moderators: Array.from(this.moderators),
                allowedGroups: Array.from(this.allowedGroups),
                blockedGroups: Array.from(this.blockedGroups),
                groupMode: this.groupMode,
                lastUpdated: new Date().toISOString()
            };
            
            await fs.ensureDir(path.dirname(this.permissionsFile));
            await fs.writeJson(this.permissionsFile, data, { spaces: 2 });
            console.log('💾 Permissions and group settings saved to file');
        } catch (error) {
            console.error('❌ Failed to save permissions:', error);
        }
    }

    /**
     * Get user role level
     * @param {string} userID - User ID to check
     * @returns {number} Role level (0=USER, 1=MOD, 2=ADMIN, 3=OWNER)
     */
    getUserRole(userID) {
        if (!userID) return this.permissions.USER;
        
        // Check if owner/admin (from environment)
        if (this.adminUids.includes(userID)) {
            return this.permissions.OWNER;
        }
        
        // Check if moderator (from file)
        if (this.moderators.has(userID)) {
            return this.permissions.MOD;
        }
        
        return this.permissions.USER;
    }

    /**
     * Get user role name
     * @param {string} userID - User ID to check
     * @returns {string} Role name
     */
    getUserRoleName(userID) {
        const role = this.getUserRole(userID);
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
    hasPermission(userID, minRole) {
        const userRole = this.getUserRole(userID);
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
    isModerator(userID) {
        return this.getUserRole(userID) >= this.permissions.MOD;
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
        console.log(`👮 Moderator role granted to ${targetID} by ${granterID}`);
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
        console.log(`👮 Moderator role revoked from ${targetID} by ${granterID}`);
        return true;
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
        return [...this.adminUids];
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
        console.log('🔄 Permissions reloaded');
    }

    /**
     * Get permission statistics
     * @returns {Object} Permission stats
     */
    getStats() {
        return {
            totalAdmins: this.adminUids.length,
            totalModerators: this.moderators.size,
            totalAllowedGroups: this.allowedGroups.size,
            totalBlockedGroups: this.blockedGroups.size,
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
        if (!this.isOwner(granterID)) {
            return false;
        }
        
        this.allowedGroups.add(threadID);
        this.blockedGroups.delete(threadID); // Remove from blacklist if exists
        await this.saveModeratorsToFile();
        console.log(`✅ Group ${threadID} added to allowed list by ${granterID}`);
        return true;
    }

    /**
     * Remove group from allowed list
     * @param {string} granterID - ID of user removing permission
     * @param {string} threadID - Thread/Group ID to remove
     * @returns {boolean} True if successful
     */
    async disallowGroup(granterID, threadID) {
        if (!this.isOwner(granterID)) {
            return false;
        }
        
        this.allowedGroups.delete(threadID);
        await this.saveModeratorsToFile();
        console.log(`❌ Group ${threadID} removed from allowed list by ${granterID}`);
        return true;
    }

    /**
     * Add group to blocked list (blacklist mode)
     * @param {string} granterID - ID of user blocking
     * @param {string} threadID - Thread/Group ID to block
     * @returns {boolean} True if successful
     */
    async blockGroup(granterID, threadID) {
        if (!this.isOwner(granterID)) {
            return false;
        }
        
        this.blockedGroups.add(threadID);
        this.allowedGroups.delete(threadID); // Remove from whitelist if exists
        await this.saveModeratorsToFile();
        console.log(`🚫 Group ${threadID} added to blocked list by ${granterID}`);
        return true;
    }

    /**
     * Remove group from blocked list
     * @param {string} granterID - ID of user unblocking
     * @param {string} threadID - Thread/Group ID to unblock
     * @returns {boolean} True if successful
     */
    async unblockGroup(granterID, threadID) {
        if (!this.isOwner(granterID)) {
            return false;
        }
        
        this.blockedGroups.delete(threadID);
        await this.saveModeratorsToFile();
        console.log(`✅ Group ${threadID} removed from blocked list by ${granterID}`);
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
        console.log(`🔄 Group mode changed to ${mode} by ${granterID}`);
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
        console.log(`🗑️ All group settings cleared by ${granterID}`);
        return true;
    }
}

module.exports = AuthManager;
