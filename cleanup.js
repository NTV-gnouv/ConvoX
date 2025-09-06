#!/usr/bin/env node

/**
 * ConvoX Bot Cleanup Script
 * Cleans up temporary files and logs
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class BotCleanup {
    constructor() {
        this.cleanupPaths = [
            './logs',
            './tmp',
            './temp',
            './.tmp',
            './cache',
            './node_modules/.cache'
        ];
    }

    async cleanupLogs() {
        try {
            console.log(chalk.blue('🧹 Cleaning up logs...'));
            
            const logDir = './logs';
            if (await fs.pathExists(logDir)) {
                const files = await fs.readdir(logDir);
                let cleanedCount = 0;
                
                for (const file of files) {
                    const filePath = path.join(logDir, file);
                    const stats = await fs.stat(filePath);
                    
                    // Remove log files older than 7 days
                    const daysDiff = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
                    if (daysDiff > 7) {
                        await fs.remove(filePath);
                        cleanedCount++;
                    }
                }
                
                console.log(chalk.green(`✅ Cleaned ${cleanedCount} old log files`));
            }
        } catch (error) {
            console.error(chalk.red('❌ Error cleaning logs:'), error);
        }
    }

    async cleanupTempFiles() {
        try {
            console.log(chalk.blue('🧹 Cleaning up temporary files...'));
            
            let cleanedCount = 0;
            
            for (const cleanupPath of this.cleanupPaths) {
                if (await fs.pathExists(cleanupPath)) {
                    await fs.remove(cleanupPath);
                    cleanedCount++;
                }
            }
            
            console.log(chalk.green(`✅ Cleaned ${cleanedCount} temporary directories`));
        } catch (error) {
            console.error(chalk.red('❌ Error cleaning temp files:'), error);
        }
    }

    async cleanupCache() {
        try {
            console.log(chalk.blue('🧹 Cleaning up cache...'));
            
            const cacheDirs = [
                './node_modules/.cache',
                './.cache',
                './cache'
            ];
            
            let cleanedCount = 0;
            
            for (const cacheDir of cacheDirs) {
                if (await fs.pathExists(cacheDir)) {
                    await fs.remove(cacheDir);
                    cleanedCount++;
                }
            }
            
            console.log(chalk.green(`✅ Cleaned ${cleanedCount} cache directories`));
        } catch (error) {
            console.error(chalk.red('❌ Error cleaning cache:'), error);
        }
    }

    async getDiskUsage() {
        try {
            console.log(chalk.blue('📊 Checking disk usage...'));
            
            const getSize = async (dirPath) => {
                let totalSize = 0;
                const files = await fs.readdir(dirPath);
                
                for (const file of files) {
                    const filePath = path.join(dirPath, file);
                    const stats = await fs.stat(filePath);
                    
                    if (stats.isDirectory()) {
                        totalSize += await getSize(filePath);
                    } else {
                        totalSize += stats.size;
                    }
                }
                
                return totalSize;
            };
            
            const formatBytes = (bytes) => {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };
            
            const totalSize = await getSize('./');
            console.log(chalk.cyan(`📁 Total project size: ${formatBytes(totalSize)}`));
            
        } catch (error) {
            console.error(chalk.red('❌ Error checking disk usage:'), error);
        }
    }

    async cleanup() {
        try {
            console.log(chalk.cyan('🧹 Starting ConvoX Bot cleanup...'));
            
            // Clean up different types of files
            await this.cleanupLogs();
            await this.cleanupTempFiles();
            await this.cleanupCache();
            
            // Show disk usage
            await this.getDiskUsage();
            
            console.log(chalk.green('🎉 Cleanup completed successfully!'));
            
        } catch (error) {
            console.error(chalk.red('❌ Cleanup failed:'), error);
            process.exit(1);
        }
    }
}

// Run cleanup if called directly
if (require.main === module) {
    const cleanup = new BotCleanup();
    cleanup.cleanup();
}

module.exports = BotCleanup;
