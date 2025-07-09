// Advanced Lottery Intelligence System - Helper Utilities
// Global helper functions and utilities

// Initialize performance metrics object
window.performanceMetrics = {
    loadTimes: {},
    apiCalls: 0,
    errors: 0,
    startTime: Date.now()
};

// Helper functions object
window.LotteryHelpers = {
    // Formatting functions
    formatCurrency: function(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return '$0';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    formatNumber: function(number) {
        if (typeof number !== 'number' || isNaN(number)) return '0';
        return new Intl.NumberFormat('en-US').format(number);
    },

    formatPercentage: function(decimal) {
        if (typeof decimal !== 'number' || isNaN(decimal)) return '0%';
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(decimal);
    },

    formatDate: function(date) {
        if (!date) return 'N/A';
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid Date';
        
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(dateObj);
    },

    // Validation functions
    validateLotteryNumbers: function(numbers) {
        if (!Array.isArray(numbers)) {
            return { valid: false, error: 'Numbers must be an array' };
        }
        
        if (numbers.length !== 5) {
            return { valid: false, error: 'Must select exactly 5 numbers' };
        }
        
        const uniqueNumbers = [...new Set(numbers)];
        if (uniqueNumbers.length !== 5) {
            return { valid: false, error: 'All numbers must be unique' };
        }
        
        const invalidNumbers = numbers.filter(num => 
            typeof num !== 'number' || num < 1 || num > 69 || !Number.isInteger(num)
        );
        
        if (invalidNumbers.length > 0) {
            return { valid: false, error: 'Numbers must be integers between 1 and 69' };
        }
        
        return { valid: true };
    },

    validatePowerball: function(powerball) {
        if (typeof powerball !== 'number' || !Number.isInteger(powerball)) {
            return { valid: false, error: 'Powerball must be a number' };
        }
        
        if (powerball < 1 || powerball > 26) {
            return { valid: false, error: 'Powerball must be between 1 and 26' };
        }
        
        return { valid: true };
    },

    validateApiKey: function(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return { valid: false, error: 'API key is required' };
        }
        
        if (apiKey.length < 10) {
            return { valid: false, error: 'API key is too short' };
        }
        
        if (apiKey.length > 200) {
            return { valid: false, error: 'API key is too long' };
        }
        
        return { valid: true };
    },

    // Data processing functions
    processHistoricalData: function(rawData) {
        if (!Array.isArray(rawData) || rawData.length === 0) {
            return {
                drawings: [],
                numberFrequency: {},
                powerballFrequency: {},
                hotNumbers: [],
                coldNumbers: [],
                hotPowerballs: [],
                coldPowerballs: [],
                totalDrawings: 0,
                averageFrequency: 0,
                lastUpdated: new Date().toISOString()
            };
        }

        const numberFrequency = {};
        const powerballFrequency = {};
        const validDrawings = [];

        // Initialize frequency counters
        for (let i = 1; i <= 69; i++) {
            numberFrequency[i] = 0;
        }
        for (let i = 1; i <= 26; i++) {
            powerballFrequency[i] = 0;
        }

        // Process each drawing
        rawData.forEach(drawing => {
            if (drawing && drawing.numbers && Array.isArray(drawing.numbers) && drawing.powerball) {
                validDrawings.push(drawing);
                
                // Count number frequencies
                drawing.numbers.forEach(num => {
                    if (num >= 1 && num <= 69) {
                        numberFrequency[num]++;
                    }
                });
                
                // Count powerball frequencies
                if (drawing.powerball >= 1 && drawing.powerball <= 26) {
                    powerballFrequency[drawing.powerball]++;
                }
            }
        });

        const totalDrawings = validDrawings.length;
        const averageFrequency = totalDrawings / 69;

        // Sort numbers by frequency
        const sortedNumbers = Object.entries(numberFrequency)
            .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }))
            .sort((a, b) => b.frequency - a.frequency);

        const sortedPowerballs = Object.entries(powerballFrequency)
            .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }))
            .sort((a, b) => b.frequency - a.frequency);

        return {
            drawings: validDrawings,
            numberFrequency,
            powerballFrequency,
            hotNumbers: sortedNumbers.slice(0, 20),
            coldNumbers: sortedNumbers.slice(-20).reverse(),
            hotPowerballs: sortedPowerballs.slice(0, 10),
            coldPowerballs: sortedPowerballs.slice(-10).reverse(),
            totalDrawings,
            averageFrequency,
            lastUpdated: new Date().toISOString()
        };
    },

    calculateStatistics: function(numbers) {
        if (!Array.isArray(numbers) || numbers.length === 0) {
            return {
                sum: 0,
                average: 0,
                median: 0,
                range: 0,
                evenCount: 0,
                oddCount: 0
            };
        }

        const sortedNumbers = [...numbers].sort((a, b) => a - b);
        const sum = numbers.reduce((acc, num) => acc + num, 0);
        const average = sum / numbers.length;
        
        const median = numbers.length % 2 === 0
            ? (sortedNumbers[numbers.length / 2 - 1] + sortedNumbers[numbers.length / 2]) / 2
            : sortedNumbers[Math.floor(numbers.length / 2)];
        
        const range = Math.max(...numbers) - Math.min(...numbers);
        const evenCount = numbers.filter(num => num % 2 === 0).length;
        const oddCount = numbers.length - evenCount;

        return {
            sum,
            average: Math.round(average * 100) / 100,
            median,
            range,
            evenCount,
            oddCount
        };
    },

    // Performance tracking
    trackPerformance: function(operation, startTime) {
        try {
            // Ensure performanceMetrics exists
            if (!window.performanceMetrics) {
                window.performanceMetrics = {
                    loadTimes: {},
                    apiCalls: 0,
                    errors: 0,
                    startTime: Date.now()
                };
            }

            // Ensure loadTimes exists
            if (!window.performanceMetrics.loadTimes) {
                window.performanceMetrics.loadTimes = {};
            }

            const duration = performance.now() - startTime;
            
            if (!window.performanceMetrics.loadTimes[operation]) {
                window.performanceMetrics.loadTimes[operation] = [];
            }
            
            window.performanceMetrics.loadTimes[operation].push(duration);
            
            // Keep only last 100 measurements
            if (window.performanceMetrics.loadTimes[operation].length > 100) {
                window.performanceMetrics.loadTimes[operation] = 
                    window.performanceMetrics.loadTimes[operation].slice(-100);
            }
            
            // Log slow operations
            if (duration > 1000) {
                console.warn(`Slow operation detected: ${operation} took ${Math.round(duration)}ms`);
            }
        } catch (error) {
            console.warn('Performance tracking error:', error);
        }
    },

    // Error handling
    handleApiError: function(error, context = 'API') {
        // Increment error counter
        if (window.performanceMetrics) {
            window.performanceMetrics.errors++;
        }

        let errorMessage = 'An unexpected error occurred';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Request was cancelled';
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Network connection error';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Request timed out';
        } else if (error.message.includes('HTTP')) {
            errorMessage = `Server error: ${error.message}`;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        console.error(`${context} Error:`, error);
        return errorMessage;
    },

    // Utility functions
    generateRandomNumbers: function(min, max, count) {
        const numbers = [];
        while (numbers.length < count) {
            const num = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!numbers.includes(num)) {
                numbers.push(num);
            }
        }
        return numbers.sort((a, b) => a - b);
    },

    shuffleArray: function(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

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

    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Storage functions
    saveToStorage: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.warn('Failed to save to storage:', error);
            return false;
        }
    },

    loadFromStorage: function(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Failed to load from storage:', error);
            return defaultValue;
        }
    },

    clearStorage: function(key = null) {
        try {
            if (key) {
                localStorage.removeItem(key);
            } else {
                localStorage.clear();
            }
            return true;
        } catch (error) {
            console.warn('Failed to clear storage:', error);
            return false;
        }
    }
};

// Make all functions available globally for backward compatibility
Object.keys(window.LotteryHelpers).forEach(key => {
    window[key] = window.LotteryHelpers[key];
});