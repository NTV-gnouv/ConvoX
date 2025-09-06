#!/usr/bin/env node

/**
 * ConvoX Bot Update Script
 * Handles bot updates and maintenance
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class BotUpdater {
    constructor() {
        this.updateDir = './updates';
        this.backupDir = './backups';
    }

    async checkForUpdates() {
        try {
            console.log(chalk.blue('🔍 Checking for updates...'));
            
            // Check if update directory exists
            if (!await fs.pathExists(this.updateDir)) {
                console.log(chalk.yellow('⚠️ No updates directory found'));
                return false;
            }

            const updateFiles = await fs.readdir(this.updateDir);
            if (updateFiles.length === 0) {
                console.log(chalk.green('✅ No updates available'));
                return false;
            }

            console.log(chalk.cyan(`📦 Found ${updateFiles.length} update files`));
            return true;
        } catch (error) {
            console.error(chalk.red('❌ Error checking for updates:'), error);
            return false;
        }
    }

    async createBackup() {
        try {
            console.log(chalk.blue('💾 Creating backup...'));
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
            
            await fs.ensureDir(backupPath);
            
            // Backup important files
            const filesToBackup = [
                'config/',
                'plugins/',
                'fbstate.json',
                'package.json'
            ];

            for (const file of filesToBackup) {
                if (await fs.pathExists(file)) {
                    await fs.copy(file, path.join(backupPath, file));
                }
            }

            console.log(chalk.green(`✅ Backup created: ${backupPath}`));
            return backupPath;
        } catch (error) {
            console.error(chalk.red('❌ Error creating backup:'), error);
            throw error;
        }
    }

    async applyUpdates() {
        try {
            console.log(chalk.blue('🔄 Applying updates...'));
            
            const updateFiles = await fs.readdir(this.updateDir);
            
            for (const file of updateFiles) {
                const updatePath = path.join(this.updateDir, file);
                const targetPath = path.join('./', file);
                
                await fs.copy(updatePath, targetPath);
                console.log(chalk.green(`✅ Applied: ${file}`));
            }

            // Clean up update files
            await fs.remove(this.updateDir);
            console.log(chalk.green('✅ Updates applied successfully'));
            
        } catch (error) {
            console.error(chalk.red('❌ Error applying updates:'), error);
            throw error;
        }
    }

    async update() {
        try {
            console.log(chalk.cyan('🚀 Starting bot update process...'));
            
            // Check for updates
            const hasUpdates = await this.checkForUpdates();
            if (!hasUpdates) {
                return;
            }

            // Create backup
            await this.createBackup();
            
            // Apply updates
            await this.applyUpdates();
            
            console.log(chalk.green('🎉 Update completed successfully!'));
            console.log(chalk.yellow('💡 Please restart the bot to apply changes'));
            
        } catch (error) {
            console.error(chalk.red('❌ Update failed:'), error);
            process.exit(1);
        }
    }
}

// Run update if called directly
if (require.main === module) {
    const updater = new BotUpdater();
    updater.update();
}

module.exports = BotUpdater;
