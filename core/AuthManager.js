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

            // Load moderators from permissions file
            this.loadModeratorsFromFile();
            
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
     * Save moderators to permissions.json file
     */
    async saveModeratorsToFile() {
        try {
            const data = {
                moderators: Array.from(this.moderators),
                lastUpdated: new Date().toISOString()
            };
            
            await fs.ensureDir(path.dirname(this.permissionsFile));
            await fs.writeJson(this.permissionsFile, data, { spaces: 2 });
            console.log('💾 Moderators saved to file');
        } catch (error) {
            console.error('❌ Failed to save moderators:', error);
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
            permissionsFile: this.permissionsFile,
            lastUpdated: new Date().toISOString()
        };
    }
}

module.exports = AuthManager;
