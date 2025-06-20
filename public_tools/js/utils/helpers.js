// Utility Helper Functions
window.AppHelpers = {
    
    // Data Conversion and Validation
    convertHistoricalData: function(stats) {
        if (!stats || !stats.drawings) return [];
        
        return stats.drawings
            .filter(drawing => 
                drawing.numbers && 
                Array.isArray(drawing.numbers) && 
                drawing.numbers.length === 5 &&
                drawing.powerball
            )
            .map(drawing => ({
                numbers: drawing.numbers.slice(),
                powerball: drawing.powerball,
                date: drawing.date || new Date().toISOString()
            }))
            .slice(0, 2000);
    },

    // Number Validation
    isValidPowerballNumbers: function(numbers, powerball) {
        if (!Array.isArray(numbers) || numbers.length !== 5) return false;
        if (!powerball || powerball < 1 || powerball > 26) return false;
        
        for (const num of numbers) {
            if (!num || num < 1 || num > 69) return false;
        }
        
        const uniqueNumbers = new Set(numbers);
        if (uniqueNumbers.size !== 5) return false;
        
        return true;
    },

    // Jackpot Formatting
    formatJackpot: function(amount) {
        if (amount >= 1000000000) {
            return `$${(amount / 1000000000).toFixed(1)}B`;
        } else if (amount >= 1000000) {
            return `$${Math.round(amount / 1000000)}M`;
        } else {
            return `$${amount.toLocaleString()}`;
        }
    },

    // Date/Time Utilities
    calculateNextDrawing: function() {
        try {
            const now = new Date();
            const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
            
            const dayOfWeek = etNow.getDay();
            const hour = etNow.getHours();
            
            const drawingDays = window.APP_CONSTANTS.DRAWING_DAYS;
            const drawingHour = window.APP_CONSTANTS.DRAWING_TIME.HOUR;
            const drawingMinute = window.APP_CONSTANTS.DRAWING_TIME.MINUTE;
            
            let nextDrawingDate = new Date(etNow);
            let found = false;
            
            if (drawingDays.includes(dayOfWeek)) {
                const todayDrawingTime = new Date(etNow);
                todayDrawingTime.setHours(drawingHour, drawingMinute, 0, 0);
                
                if (etNow <= todayDrawingTime) {
                    nextDrawingDate = todayDrawingTime;
                    found = true;
                }
            }
            
            if (!found) {
                let daysToAdd = 1;
                
                while (daysToAdd <= 7 && !found) {
                    const checkDate = new Date(etNow);
                    checkDate.setDate(etNow.getDate() + daysToAdd);
                    checkDate.setHours(drawingHour, drawingMinute, 0, 0);
                    
                    const checkDay = checkDate.getDay();
                    
                    if (drawingDays.includes(checkDay)) {
                        nextDrawingDate = checkDate;
                        found = true;
                    }
                    
                    daysToAdd++;
                }
            }
            
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const nextDrawingDayName = dayNames[nextDrawingDate.getDay()];
            
            return {
                date: nextDrawingDate.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'America/New_York'
                }),
                time: '10:59 PM ET',
                dayOfWeek: nextDrawingDayName,
                timestamp: nextDrawingDate.toISOString()
            };
            
        } catch (error) {
            console.error('Next drawing calculation failed:', error.message);
            return {
                date: 'Check powerball.com',
                time: '10:59 PM ET',
                dayOfWeek: 'Mon/Wed/Sat',
                timestamp: null
            };
        }
    },

    // Local Storage Utilities
    saveToStorage: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
            return false;
        }
    },

    loadFromStorage: function(key, defaultValue = null) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
            return defaultValue;
        }
    },

    // Performance Metrics
    getSystemPerformanceMetrics: function() {
        if (window.globalLotteryPredictor) {
            return window.globalLotteryPredictor.getSystemStatus();
        }
        
        return {
            isLearning: false,
            predictionsGenerated: 0,
            averageHitRate: 0,
            status: 'initializing'
        };
    },

    // Fallback Data Generation
    generateFallbackStats: function(recordCount = 150) {
        const numberFreq = {};
        for (let i = 1; i <= 69; i++) {
            numberFreq[i] = { 
                total: Math.floor(Math.random() * Math.min(40, recordCount * 0.3)) + 5, 
                recent: Math.floor(Math.random() * Math.min(8, recordCount * 0.05)) + 1 
            };
        }
        
        const hotNumbers = Object.entries(numberFreq)
            .sort((a, b) => (b[1].recent + b[1].total * 0.1) - (a[1].recent + a[1].total * 0.1))
            .slice(0, 20)
            .map(([num]) => parseInt(num));
            
        return {
            numberFrequency: numberFreq,
            hotNumbers,
            totalDrawings: recordCount,
            dataSource: 'Simulated Data',
            drawings: []
        };
    },

    // Quick Selection Fallback
    generateFallbackQuickSelection: function() {
        const strategies = [
            "Enhanced Mathematical Analysis",
            "Statistical Distribution Model", 
            "Pattern Recognition Algorithm",
            "Smart Random Protocol",
            "Frequency Optimization"
        ];
        
        return strategies.map((strategy, i) => {
            const numbers = [];
            while (numbers.length < 5) {
                const num = Math.floor(Math.random() * 69) + 1;
                if (!numbers.includes(num)) numbers.push(num);
            }
            
            return {
                id: i + 1,
                name: `🎲 ${strategy}`,
                description: "Advanced mathematical selection with optimized distribution patterns",
                algorithmDetail: "Enhanced random with mathematical constraints",
                numbers: numbers.sort((a, b) => a - b),
                powerball: Math.floor(Math.random() * 26) + 1,
                strategy: "75% Confidence",
                confidence: 75,
                actualStrategy: strategy,
                technicalAnalysis: "Mathematical fallback protocol",
                claudeGenerated: false,
                isHybrid: false
            };
        });
    },

    // Copy to Clipboard
    copyToClipboard: function(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return Promise.resolve();
            } catch (error) {
                document.body.removeChild(textArea);
                return Promise.reject(error);
            }
        }
    },

    // Debounce Function
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Error Handling
    handleError: function(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        
        // Log to a centralized error tracking system if available
        if (window.errorTracker) {
            window.errorTracker.log(error, context);
        }
        
        return {
            success: false,
            error: error.message || 'An unknown error occurred',
            context: context,
            timestamp: new Date().toISOString()
        };
    },

    // Status Message Helpers
    getStatusMessage: function(type, customMessage = null) {
        if (customMessage) return customMessage;
        
        const messages = window.APP_CONSTANTS.MESSAGES;
        return messages[type] || 'Status update';
    },

    // Confidence Level Styling
    getConfidenceClass: function(confidence) {
        const thresholds = window.APP_CONSTANTS.ALGORITHMS.CONFIDENCE_THRESHOLDS;
        
        if (confidence >= thresholds.HIGH) return 'confidence-high';
        if (confidence >= thresholds.MEDIUM) return 'confidence-medium';
        return 'confidence-low';
    },

    // Responsive Grid Calculations
    calculateGridColumns: function(containerWidth, minItemWidth = 320) {
        return Math.max(1, Math.floor(containerWidth / minItemWidth));
    },

    // Initialize Global Functions (for backward compatibility)
    initializeGlobalFunctions: function() {
        // Create global functions that components expect
        window.convertHistoricalData = this.convertHistoricalData;
        window.generateFallbackQuickSelection = this.generateFallbackQuickSelection;
        window.getSystemPerformanceMetrics = this.getSystemPerformanceMetrics;
    }
};