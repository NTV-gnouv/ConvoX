const fs = require('fs-extra');
const path = require('path');

class PluginManager {
    constructor(api, config) {
        this.api = api;
        this.config = config;
        this.plugins = new Map();
        this.pluginDir = config.plugins.pluginDir;
        this.autoLoad = config.plugins.autoLoad;
        this.hotReload = config.plugins.hotReload;
    }

    async loadPlugins() {
        try {
            console.log('🔌 Loading plugins...');
            
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
            
            console.log(`✅ Loaded ${this.plugins.size} plugins`);
        } catch (error) {
            console.error('❌ Failed to load plugins:', error);
            throw error;
        }
    }

    async loadPlugin(pluginName) {
        try {
            const pluginPath = path.join(this.pluginDir, pluginName);
            const pluginFile = path.join(pluginPath, 'index.js');
            
            // Check if plugin exists
            if (!await fs.pathExists(pluginFile)) {
                console.log(`⚠️ Plugin ${pluginName} not found at ${pluginFile}`);
                return false;
            }

            // Check if plugin is already loaded
            if (this.plugins.has(pluginName)) {
                console.log(`⚠️ Plugin ${pluginName} is already loaded`);
                return true;
            }

            // Load plugin configuration
            const pluginConfig = this.config.plugins.pluginConfig[pluginName] || {};
            
            // Check if plugin is enabled
            if (pluginConfig.enabled === false) {
                console.log(`⚠️ Plugin ${pluginName} is disabled`);
                return false;
            }

            // Load plugin module
            const PluginClass = require(pluginFile);
            const plugin = new PluginClass(this.api, pluginConfig);
            
            // Initialize plugin
            if (typeof plugin.initialize === 'function') {
                await plugin.initialize();
            }

            // Register plugin
            this.plugins.set(pluginName, {
                instance: plugin,
                config: pluginConfig,
                path: pluginPath,
                loadedAt: Date.now()
            });

            console.log(`✅ Plugin loaded: ${pluginName}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to load plugin ${pluginName}:`, error);
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
            console.error('❌ Failed to load plugins from directory:', error);
        }
    }

    async unloadPlugin(pluginName) {
        try {
            const plugin = this.plugins.get(pluginName);
            if (!plugin) {
                console.log(`⚠️ Plugin ${pluginName} is not loaded`);
                return false;
            }

            // Cleanup plugin
            if (typeof plugin.instance.cleanup === 'function') {
                await plugin.instance.cleanup();
            }

            // Remove from plugins map
            this.plugins.delete(pluginName);
            
            console.log(`✅ Plugin unloaded: ${pluginName}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to unload plugin ${pluginName}:`, error);
            return false;
        }
    }

    async reloadPlugin(pluginName) {
        try {
            console.log(`🔄 Reloading plugin: ${pluginName}`);
            
            // Unload first
            await this.unloadPlugin(pluginName);
            
            // Clear require cache
            const pluginPath = path.join(this.pluginDir, pluginName, 'index.js');
            delete require.cache[require.resolve(pluginPath)];
            
            // Load again
            await this.loadPlugin(pluginName);
            
            console.log(`✅ Plugin reloaded: ${pluginName}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to reload plugin ${pluginName}:`, error);
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
                
                console.log(`✅ Plugin enabled: ${pluginName}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`❌ Failed to enable plugin ${pluginName}:`, error);
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
                
                console.log(`✅ Plugin disabled: ${pluginName}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`❌ Failed to disable plugin ${pluginName}:`, error);
            return false;
        }
    }

    async savePluginConfig() {
        try {
            const configPath = './config/plugins.json';
            await fs.writeJson(configPath, this.config.plugins, { spaces: 2 });
        } catch (error) {
            console.error('❌ Failed to save plugin config:', error);
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
                    console.log(`🔄 Hot reloading plugin: ${pluginName}`);
                    await this.reloadPlugin(pluginName);
                }
            });

            console.log('🔥 Hot reload enabled for plugins');
        } catch (error) {
            console.error('❌ Failed to setup hot reload:', error);
        }
    }
}

module.exports = PluginManager;
