const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

class Logger {
    constructor(config = {}) {
        this.config = {
            level: config.level || 'info', // debug, info, warn, error, silent
            enableColors: config.enableColors !== false,
            enableFileLogging: config.enableFileLogging || false,
            logFile: config.logFile || './logs/bot.log',
            maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
            maxFiles: config.maxFiles || 5,
            ...config
        };

        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
            silent: 4
        };

        this.colors = {
            debug: chalk.gray,
            info: chalk.blue,
            warn: chalk.yellow,
            error: chalk.red,
            success: chalk.green,
            system: chalk.cyan
        };

        this.logCounts = new Map();
        this.lastLogTime = new Map();
        this.logInterval = 5000; // 5 seconds

        // Ensure log directory exists
        if (this.config.enableFileLogging) {
            fs.ensureDirSync(path.dirname(this.config.logFile));
        }
    }

    shouldLog(level) {
        return this.levels[level] >= this.levels[this.config.level];
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const levelUpper = level.toUpperCase().padEnd(5);
        
        let formattedMessage = `[${timestamp}] ${levelUpper} ${message}`;
        
        if (data) {
            formattedMessage += ` ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}`;
        }

        return formattedMessage;
    }

    log(level, message, data = null) {
        if (!this.shouldLog(level)) return;

        const formattedMessage = this.formatMessage(level, message, data);
        
        // Console output with colors
        if (this.config.enableColors) {
            const colorFn = this.colors[level] || this.colors.info;
            console.log(colorFn(formattedMessage));
        } else {
            console.log(formattedMessage);
        }

        // File output
        if (this.config.enableFileLogging) {
            this.writeToFile(formattedMessage);
        }
    }

    async writeToFile(message) {
        try {
            await fs.appendFile(this.config.logFile, message + '\n');
            
            // Check file size and rotate if needed
            const stats = await fs.stat(this.config.logFile);
            if (stats.size > this.config.maxFileSize) {
                await this.rotateLogFile();
            }
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    async rotateLogFile() {
        try {
            const logDir = path.dirname(this.config.logFile);
            const logBaseName = path.basename(this.config.logFile, '.log');
            
            // Move existing files
            for (let i = this.config.maxFiles - 1; i > 0; i--) {
                const oldFile = path.join(logDir, `${logBaseName}.${i}.log`);
                const newFile = path.join(logDir, `${logBaseName}.${i + 1}.log`);
                
                if (await fs.pathExists(oldFile)) {
                    await fs.move(oldFile, newFile);
                }
            }
            
            // Move current log to .1
            const currentLog = path.join(logDir, `${logBaseName}.1.log`);
            await fs.move(this.config.logFile, currentLog);
            
            // Create new log file
            await fs.writeFile(this.config.logFile, '');
        } catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }

    // Convenience methods
    debug(message, data = null) {
        this.log('debug', message, data);
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    error(message, data = null) {
        this.log('error', message, data);
    }

    success(message, data = null) {
        this.log('info', `✅ ${message}`, data);
    }

    system(message, data = null) {
        this.log('info', `🔧 ${message}`, data);
    }

    // Throttled logging to prevent spam
    throttledLog(level, message, data = null, throttleKey = null) {
        const key = throttleKey || message;
        const now = Date.now();
        const lastTime = this.lastLogTime.get(key) || 0;
        
        if (now - lastTime < this.logInterval) {
            const count = this.logCounts.get(key) || 0;
            this.logCounts.set(key, count + 1);
            return;
        }
        
        // Reset counter and log
        const count = this.logCounts.get(key) || 0;
        this.logCounts.set(key, 0);
        this.lastLogTime.set(key, now);
        
        if (count > 0) {
            this.log(level, `${message} (${count} similar messages suppressed)`, data);
        } else {
            this.log(level, message, data);
        }
    }

    // Command logging
    command(command, userID, threadID, success = true) {
        const status = success ? '✅' : '❌';
        const message = `Command: ${command} by ${userID} in ${threadID}`;
        this.info(`${status} ${message}`);
    }

    // Plugin logging
    plugin(action, pluginName, success = true) {
        const status = success ? '✅' : '❌';
        const message = `Plugin ${action}: ${pluginName}`;
        this.info(`${status} ${message}`);
    }

    // API logging
    api(action, details = null) {
        const message = `Facebook API ${action}`;
        this.info(`🔗 ${message}`, details);
    }

    // Error logging with context
    logError(error, context = null) {
        const message = context ? `${context}: ${error.message}` : error.message;
        this.error(message, {
            stack: error.stack,
            ...error
        });
    }

    // Get log statistics
    getStats() {
        return {
            level: this.config.level,
            fileLogging: this.config.enableFileLogging,
            throttledMessages: Object.fromEntries(this.logCounts),
            lastLogTimes: Object.fromEntries(this.lastLogTime)
        };
    }

    // Update configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

module.exports = Logger;
