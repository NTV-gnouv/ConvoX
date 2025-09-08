const fs = require('fs-extra');
const { spawn } = require('child_process');
const path = require('path');

class AutoRestart {
    constructor(logger = null) {
        this.logger = logger;
        this.restartCount = 0;
        this.maxRestarts = 5;
        this.restartDelay = 5000; // 5 giây
        this.restartWindow = 300000; // 5 phút reset counter
        this.lastRestartTime = 0;
        this.isRestarting = false;
        this.processTitle = 'ConvoX Bot';
    }

    /**
     * Kiểm tra có nên restart không
     */
    shouldRestart(error) {
        const now = Date.now();
        
        // Reset counter nếu đã qua 5 phút
        if (now - this.lastRestartTime > this.restartWindow) {
            this.restartCount = 0;
        }

        // Kiểm tra số lần restart
        if (this.restartCount >= this.maxRestarts) {
            if (this.logger) {
                this.logger.error(`❌ Đã restart ${this.maxRestarts} lần trong 5 phút. Dừng auto restart.`);
            }
            return false;
        }

        // Kiểm tra lỗi có nên restart không
        if (error && typeof error.message === 'string') {
            const errorMsg = error.message.toLowerCase();
            
            // Các lỗi nên restart
            const restartableErrors = [
                'checkpoint',
                'security',
                'verification',
                'network',
                'timeout',
                'connection',
                'econnreset',
                'enotfound',
                'etimedout',
                'socket hang up'
            ];

            // Các lỗi không nên restart
            const nonRestartableErrors = [
                'invalid credentials',
                'account locked',
                'permission denied',
                'file not found',
                'config error'
            ];

            const shouldRestart = restartableErrors.some(keyword => errorMsg.includes(keyword));
            const shouldNotRestart = nonRestartableErrors.some(keyword => errorMsg.includes(keyword));

            if (shouldNotRestart) {
                if (this.logger) {
                    this.logger.error('❌ Lỗi nghiêm trọng, không thể auto restart:', error.message);
                }
                return false;
            }

            return shouldRestart;
        }

        return true; // Default: restart nếu không rõ lỗi
    }

    /**
     * Thực hiện restart
     */
    async restart(reason = 'Unknown error') {
        if (this.isRestarting) {
            return false;
        }

        this.isRestarting = true;
        this.restartCount++;
        this.lastRestartTime = Date.now();

        if (this.logger) {
            this.logger.warn(`🔄 Auto restarting bot (${this.restartCount}/${this.maxRestarts})`);
            this.logger.info(`📝 Restart reason: ${reason}`);
            this.logger.info(`⏱️ Delay: ${this.restartDelay / 1000}s`);
        }

        try {
            // Cleanup trước khi restart
            if (global.botManager) {
                await global.botManager.stop();
            }

            // Delay trước khi restart
            await this.sleep(this.restartDelay);

            // Log restart info
            const restartInfo = {
                timestamp: new Date().toISOString(),
                reason: reason,
                count: this.restartCount,
                pid: process.pid
            };

            await this.saveRestartLog(restartInfo);

            if (this.logger) {
                this.logger.system('🚀 Restarting ConvoX Bot...');
            }

            // Restart process
            this.spawnNewProcess();

        } catch (error) {
            if (this.logger) {
                this.logger.logError(error, 'Failed to restart bot');
            }
            this.isRestarting = false;
            return false;
        }

        return true;
    }

    /**
     * Spawn process mới
     */
    spawnNewProcess() {
        const args = process.argv.slice(1);
        const options = {
            detached: false,
            stdio: 'inherit',
            cwd: process.cwd(),
            env: process.env
        };

        const child = spawn(process.execPath, args, options);

        child.on('error', (error) => {
            if (this.logger) {
                this.logger.logError(error, 'Failed to spawn new process');
            }
            process.exit(1);
        });

        // Exit current process
        process.exit(0);
    }

    /**
     * Lưu log restart
     */
    async saveRestartLog(info) {
        try {
            const logFile = './logs/restart.log';
            await fs.ensureDir(path.dirname(logFile));
            
            const logEntry = `${info.timestamp} | Count: ${info.count} | Reason: ${info.reason} | PID: ${info.pid}\n`;
            await fs.appendFile(logFile, logEntry);
            
        } catch (error) {
            // Ignore log errors
        }
    }

    /**
     * Setup auto restart handlers
     */
    setupAutoRestart() {
        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            if (this.logger) {
                this.logger.logError(error, 'Uncaught Exception - Auto Restart');
            }

            if (this.shouldRestart(error)) {
                await this.restart(`Uncaught Exception: ${error.message}`);
            } else {
                process.exit(1);
            }
        });

        // Handle unhandled rejections
        process.on('unhandledRejection', async (reason, promise) => {
            const error = reason instanceof Error ? reason : new Error(String(reason));
            
            if (this.logger) {
                this.logger.logError(error, 'Unhandled Rejection - Auto Restart');
            }

            if (this.shouldRestart(error)) {
                await this.restart(`Unhandled Rejection: ${error.message}`);
            } else {
                process.exit(1);
            }
        });

        if (this.logger) {
            this.logger.system('🔄 Auto restart system enabled');
        }
    }

    /**
     * Handle Facebook connection errors
     */
    async handleFacebookError(error) {
        if (this.shouldRestart(error)) {
            return await this.restart(`Facebook Error: ${error.message}`);
        }
        return false;
    }

    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get restart statistics
     */
    getStats() {
        return {
            restartCount: this.restartCount,
            maxRestarts: this.maxRestarts,
            lastRestartTime: this.lastRestartTime,
            isRestarting: this.isRestarting
        };
    }

    /**
     * Reset restart counter manually
     */
    resetCounter() {
        this.restartCount = 0;
        this.lastRestartTime = 0;
        if (this.logger) {
            this.logger.info('🔄 Restart counter reset');
        }
    }
}

module.exports = AutoRestart;
