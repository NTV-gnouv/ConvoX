const Logger = require('./Logger');

class ErrorLogger {
    constructor(logger = null) {
        this.errorCounts = new Map();
        this.lastLogTime = new Map();
        this.logInterval = 30000; // 30 seconds
        this.logger = logger || new Logger();
    }

    logError(errorType, error) {
        const now = Date.now();
        const lastTime = this.lastLogTime.get(errorType) || 0;
        
        // If same error happened recently, just increment counter
        if (now - lastTime < this.logInterval) {
            const count = this.errorCounts.get(errorType) || 0;
            this.errorCounts.set(errorType, count + 1);
            return;
        }
        
        // Reset counter and log the error
        this.errorCounts.set(errorType, 0);
        this.lastLogTime.set(errorType, now);
        
        if (error.statusCode === 404) {
            this.logger.throttledLog('warn', 'Facebook API temporarily unavailable (404)', null, 'api_404');
        } else {
            this.logger.throttledLog('warn', `${errorType}: ${error.message || 'Unknown error'}`, null, errorType);
        }
    }

    getErrorSummary() {
        const summary = [];
        for (const [errorType, count] of this.errorCounts.entries()) {
            if (count > 0) {
                summary.push(`${errorType}: ${count} occurrences`);
            }
        }
        return summary;
    }
}

module.exports = ErrorLogger;
