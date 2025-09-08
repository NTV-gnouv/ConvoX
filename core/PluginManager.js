const fs = require('fs-extra');
const path = require('path');
const Logger = require('./Logger');

class PluginManager {
    constructor(api, config, authManager, commandHandler, logger) {
        this.api = api;
        this.config = config;
        this.authManager = authManager;
        this.commandHandler = commandHandler;
        this.logger = logger;
        this.plugins = new Map();
        this.pluginDir = config.plugins.pluginDir;
        this.autoLoad = config.plugins.autoLoad;
        this.hotReload = config.plugins.hotReload;
    }

    async loadPlugins() {
        try {
            this.logger.system('Loading plugins...');
            
            // Ensure plugin directory exists
            await fs.ensureDir(this.pluginDir);
            
            // Load default plugins
            if (this.autoLoad && this.config.plugins.defaultPlugins) {
                for (const pluginName of this.config.plugins.defaultPlugins) {
                    await this.loadPlugin(pluginName);
                }
            }

            // Load additional plugins from directory
            await this.loadPluginsFromDirectory();
            
            this.logger.success(`Loaded ${this.plugins.size} plugins`);
        } catch (error) {
            this.logger.logError(error, 'Failed to load plugins');
            throw error;
        }
    }

    async loadPlugin(pluginName) {
        try {
            const pluginPath = path.join(this.pluginDir, pluginName);
            const pluginFile = path.join(pluginPath, 'index.js');
            
            // Check if plugin exists
            if (!await fs.pathExists(pluginFile)) {
                this.logger.warn(`Plugin ${pluginName} not found at ${pluginFile}`);
                return false;
            }

            // Check if plugin is already loaded
            if (this.plugins.has(pluginName)) {
                this.logger.warn(`Plugin ${pluginName} is already loaded`);
                return true;
            }

            // Load plugin configuration
            const pluginConfig = this.config.plugins.pluginConfig[pluginName] || {};
            
            // Check if plugin is enabled
            if (pluginConfig.enabled === false) {
                this.logger.warn(`Plugin ${pluginName} is disabled`);
                return false;
            }

            // Load plugin module - use absolute path for require
            const PluginClass = require(path.resolve(pluginFile));
            const plugin = new PluginClass(this.api, pluginConfig, this.authManager, this.logger);
            
            // Initialize plugin
            if (typeof plugin.initialize === 'function') {
                await plugin.initialize();
            }

            // Register commands if plugin has registerCommands method
            const commandsBefore = this.commandHandler.getCommandCount();
            if (typeof plugin.registerCommands === 'function' && this.commandHandler) {
                plugin.registerCommands(this.commandHandler);
            }
            const commandsAfter = this.commandHandler.getCommandCount();
            const commandsRegistered = commandsAfter - commandsBefore;

            // Register plugin
            this.plugins.set(pluginName, {
                instance: plugin,
                config: pluginConfig,
                path: pluginPath,
                loadedAt: Date.now()
            });

            // Plugin loaded successfully (no individual logging to reduce console spam)
            return true;
        } catch (error) {
            this.logger.logError(error, `Failed to load plugin ${pluginName}`);
            return false;
        }
    }

    async loadPluginsFromDirectory() {
        try {
            const entries = await fs.readdir(this.pluginDir, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const pluginName = entry.name;
                    
                    // Skip if already loaded or not in default plugins
                    if (!this.plugins.has(pluginName) && 
                        !this.config.plugins.defaultPlugins.includes(pluginName)) {
                        await this.loadPlugin(pluginName);
                    }
                }
            }
        } catch (error) {
            this.logger.logError(error, 'Failed to load plugins from directory');
        }
    }

    async unloadPlugin(pluginName) {
        try {
            const plugin = this.plugins.get(pluginName);
            if (!plugin) {
                this.logger.warn(`Plugin ${pluginName} is not loaded`);
                return false;
            }

            // Cleanup plugin
            if (typeof plugin.instance.cleanup === 'function') {
                await plugin.instance.cleanup();
            }

            // Remove from plugins map
            this.plugins.delete(pluginName);
            
            this.logger.plugin('unloaded', pluginName);
            return true;
        } catch (error) {
            this.logger.logError(error, `Failed to unload plugin ${pluginName}`);
            return false;
        }
    }

    async reloadPlugin(pluginName) {
        try {
            this.logger.info(`Reloading plugin: ${pluginName}`);
            
            // Unload first
            await this.unloadPlugin(pluginName);
            
            // Clear require cache
            const pluginPath = path.join(this.pluginDir, pluginName, 'index.js');
            delete require.cache[require.resolve(path.resolve(pluginPath))];
            
            // Load again
            await this.loadPlugin(pluginName);
            
            this.logger.plugin('reloaded', pluginName);
            return true;
        } catch (error) {
            this.logger.logError(error, `Failed to reload plugin ${pluginName}`);
            return false;
        }
    }

    getPlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        return plugin ? plugin.instance : null;
    }

    getPluginCount() {
        return this.plugins.size;
    }

    getAllPlugins() {
        return Array.from(this.plugins.keys());
    }

    getPluginInfo(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return null;

        return {
            name: pluginName,
            config: plugin.config,
            path: plugin.path,
            loadedAt: plugin.loadedAt,
            uptime: Date.now() - plugin.loadedAt
        };
    }

    async enablePlugin(pluginName) {
        try {
            const pluginConfig = this.config.plugins.pluginConfig[pluginName];
            if (pluginConfig) {
                pluginConfig.enabled = true;
                await this.savePluginConfig();
                
                if (!this.plugins.has(pluginName)) {
                    await this.loadPlugin(pluginName);
                }
                
                this.logger.plugin('enabled', pluginName);
                return true;
            }
            return false;
        } catch (error) {
                this.logger.logError(error, `Failed to enable plugin ${pluginName}`);
            return false;
        }
    }

    async disablePlugin(pluginName) {
        try {
            const pluginConfig = this.config.plugins.pluginConfig[pluginName];
            if (pluginConfig) {
                pluginConfig.enabled = false;
                await this.savePluginConfig();
                
                if (this.plugins.has(pluginName)) {
                    await this.unloadPlugin(pluginName);
                }
                
                this.logger.plugin('disabled', pluginName);
                return true;
            }
            return false;
        } catch (error) {
                this.logger.logError(error, `Failed to disable plugin ${pluginName}`);
            return false;
        }
    }

    async savePluginConfig() {
        try {
            const configPath = './config/plugins.json';
            await fs.writeJson(configPath, this.config.plugins, { spaces: 2 });
        } catch (error) {
            this.logger.logError(error, 'Failed to save plugin config');
        }
    }

    // Hot reload functionality
    async setupHotReload() {
        if (!this.hotReload) return;

        try {
            const chokidar = require('chokidar');
            const watcher = chokidar.watch(this.pluginDir, {
                ignored: /(^|[\/\\])\../, // ignore dotfiles
                persistent: true
            });

            watcher.on('change', async (filePath) => {
                const pluginName = path.basename(path.dirname(filePath));
                if (this.plugins.has(pluginName)) {
                    this.logger.info(`Hot reloading plugin: ${pluginName}`);
                    await this.reloadPlugin(pluginName);
                }
            });

            this.logger.info('Hot reload enabled for plugins');
        } catch (error) {
            this.logger.logError(error, 'Failed to setup hot reload');
        }
    }
}

module.exports = PluginManager;
