// Type definitions for ConvoX Bot

/**
 * @typedef {Object} BotConfig
 * @property {Object} bot - Bot configuration
 * @property {string} bot.name - Bot name
 * @property {string} bot.version - Bot version
 * @property {string} bot.prefix - Command prefix
 * @property {Array<string>} bot.admin - Admin user IDs
 * @property {boolean} bot.autoReply - Auto reply enabled
 * @property {boolean} bot.autoMarkRead - Auto mark as read
 * @property {string} bot.logLevel - Log level
 * @property {Object} facebook - Facebook configuration
 * @property {string} facebook.fbstate - FBState file path
 * @property {string} [facebook.appstate] - (Optional) legacy AppSt
 * @property {boolean} facebook.listenTyping - Listen to typing
 * @property {boolean} facebook.selfListen - Listen to self messages
 * @property {Object} features - Feature flags
 * @property {boolean} features.menu - Menu system enabled
 * @property {boolean} features.plugins - Plugin system enabled
 * @property {boolean} features.commands - Command system enabled
 * @property {boolean} features.autoReply - Auto reply enabled
 */

/**
 * @typedef {Object} CommandConfig
 * @property {Object} categories - Command categories
 * @property {Object} menu - Menu configuration
 * @property {string} menu.title - Menu title
 * @property {string} menu.subtitle - Menu subtitle
 * @property {string} menu.footer - Menu footer
 */

/**
 * @typedef {Object} PluginConfig
 * @property {boolean} enabled - Plugins enabled
 * @property {boolean} autoLoad - Auto load plugins
 * @property {boolean} hotReload - Hot reload enabled
 * @property {string} pluginDir - Plugin directory
 * @property {Array<string>} defaultPlugins - Default plugins to load
 * @property {Object} pluginConfig - Individual plugin configurations
 */

/**
 * @typedef {Object} FacebookEvent
 * @property {string} type - Event type
 * @property {string} body - Message body
 * @property {string} senderID - Sender user ID
 * @property {string} threadID - Thread ID
 * @property {string} messageID - Message ID
 * @property {number} timestamp - Event timestamp
 */

/**
 * @typedef {Object} CommandData
 * @property {string} name - Command name
 * @property {Function} handler - Command handler function
 * @property {string} description - Command description
 * @property {string} usage - Command usage
 * @property {string} example - Command example
 * @property {string} category - Command category
 * @property {number} cooldown - Command cooldown in seconds
 * @property {boolean} adminOnly - Admin only command
 * @property {boolean} enabled - Command enabled
 * @property {Array<string>} aliases - Command aliases
 */

/**
 * @typedef {Object} PluginData
 * @property {Object} instance - Plugin instance
 * @property {Object} config - Plugin configuration
 * @property {string} path - Plugin path
 * @property {number} loadedAt - Load timestamp
 */

/**
 * @typedef {Object} CategoryData
 * @property {string} name - Category name
 * @property {string} description - Category description
 * @property {Array<CommandData>} commands - Category commands
 */

/**
 * @typedef {Object} BotStats
 * @property {boolean} running - Bot running status
 * @property {number} uptime - Bot uptime in milliseconds
 * @property {number} commands - Number of registered commands
 * @property {number} plugins - Number of loaded plugins
 * @property {number} totalCommands - Total commands executed
 * @property {Object} commandsByCategory - Commands by category
 * @property {Array<Object>} mostUsedCommands - Most used commands
 */

/**
 * @typedef {Object} PluginInfo
 * @property {string} name - Plugin name
 * @property {string} version - Plugin version
 * @property {string} description - Plugin description
 * @property {Object} config - Plugin configuration
 * @property {string} path - Plugin path
 * @property {number} loadedAt - Load timestamp
 * @property {number} uptime - Plugin uptime
 */

module.exports = {};
