class MenuPlugin {
    constructor(api, config) {
        this.api = api;
        this.config = config;
        this.name = 'Menu Plugin';
        this.version = '1.0.0';
    }

    async initialize() {
        // Plugin initialized silently
    }

    async cleanup() {
        // Plugin cleaned up silently
    }

    // Plugin methods can be called by the core system
    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: 'Handles menu display and navigation'
        };
    }
}

module.exports = MenuPlugin;
