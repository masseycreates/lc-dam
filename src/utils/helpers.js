// Advanced Lottery Intelligence System - Helper Utilities
// Global helper functions available throughout the application

window.LotteryHelpers = {
    // Number formatting utilities
    formatCurrency: function(amount, options = {}) {
        const { 
            minimumFractionDigits = 0, 
            maximumFractionDigits = 0,
            currency = 'USD',
            locale = 'en-US'
        } = options;
        
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits,
            maximumFractionDigits
        }).format(amount);
    },

    formatNumber: function(number, options = {}) {
        const { 
            minimumFractionDigits = 0,
            maximumFractionDigits = 3,
            locale = 'en-US'
        } = options;
        
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits,
            maximumFractionDigits
        }).format(number);
    },

    formatPercentage: function(decimal, options = {}) {
        const { 
            minimumFractionDigits = 1,
            maximumFractionDigits = 2,
            locale = 'en-US'
        } = options;
        
        return new Intl.NumberFormat(locale, {
            style: 'percent',
            minimumFractionDigits,
            maximumFractionDigits
        }).format(decimal);
    },

    formatDate: function(date, options = {}) {
        const { 
            dateStyle = 'medium',
            timeStyle = 'short',
            locale = 'en-US'
        } = options;
        
        return new Intl.DateTimeFormat(locale, {
            dateStyle,
            timeStyle
        }).format(new Date(date));
    },

    // Validation utilities
    validateLotteryNumbers: function(numbers) {
        if (!Array.isArray(numbers) || numbers.length !== 5) {
            return { valid: false, error: 'Must provide exactly 5 main numbers' };
        }
        
        const uniqueNumbers = [...new Set(numbers)];
        if (uniqueNumbers.length !== 5) {
            return { valid: false, error: 'All numbers must be unique' };
        }
        
        const invalidNumbers = numbers.filter(num => 
            !Number.isInteger(num) || num < 1 || num > 69
        );
        
        if (invalidNumbers.length > 0) {
            return { valid: false, error: 'Numbers must be integers between 1 and 69' };
        }
        
        return { valid: true };
    },

    validatePowerball: function(powerball) {
        if (!Number.isInteger(powerball) || powerball < 1 || powerball > 26) {
            return { valid: false, error: 'Powerball must be an integer between 1 and 26' };
        }
        
        return { valid: true };
    },

    validateApiKey: function(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return { valid: false, error: 'API key is required' };
        }
        
        if (!apiKey.startsWith('sk-ant-')) {
            return { valid: false, error: 'Invalid Claude API key format' };
        }
        
        if (apiKey.length < 20) {
            return { valid: false, error: 'API key appears to be too short' };
        }
        
        return { valid: true };
    },

    // Data processing utilities
    processHistoricalData: function(rawData) {
        if (!rawData || !Array.isArray(rawData.drawings)) {
            return null;
        }

        const drawings = rawData.drawings;
        const totalDrawings = drawings.length;
        
        // Calculate frequency statistics
        const numberFrequency = {};
        const powerballFrequency = {};
        
        for (let i = 1; i <= 69; i++) {
            numberFrequency[i] = 0;
        }
        
        for (let i = 1; i <= 26; i++) {
            powerballFrequency[i] = 0;
        }
        
        drawings.forEach(drawing => {
            if (drawing.numbers && Array.isArray(drawing.numbers)) {
                drawing.numbers.forEach(num => {
                    if (numberFrequency[num] !== undefined) {
                        numberFrequency[num]++;
                    }
                });
            }
            
            if (drawing.powerball && powerballFrequency[drawing.powerball] !== undefined) {
                powerballFrequency[drawing.powerball]++;
            }
        });
        
        // Calculate hot and cold numbers
        const sortedNumbers = Object.entries(numberFrequency)
            .sort(([,a], [,b]) => b - a)
            .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }));
            
        const sortedPowerballs = Object.entries(powerballFrequency)
            .sort(([,a], [,b]) => b - a)
            .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }));
        
        return {
            totalDrawings,
            numberFrequency,
            powerballFrequency,
            hotNumbers: sortedNumbers.slice(0, 10),
            coldNumbers: sortedNumbers.slice(-10).reverse(),
            hotPowerballs: sortedPowerballs.slice(0, 5),
            coldPowerballs: sortedPowerballs.slice(-5).reverse(),
            averageFrequency: totalDrawings / 69,
            lastUpdated: new Date().toISOString()
        };
    },

    calculateStatistics: function(numbers) {
        if (!Array.isArray(numbers) || numbers.length === 0) {
            return null;
        }
        
        const sum = numbers.reduce((a, b) => a + b, 0);
        const mean = sum / numbers.length;
        
        const sortedNumbers = [...numbers].sort((a, b) => a - b);
        const median = sortedNumbers.length % 2 === 0
            ? (sortedNumbers[sortedNumbers.length / 2 - 1] + sortedNumbers[sortedNumbers.length / 2]) / 2
            : sortedNumbers[Math.floor(sortedNumbers.length / 2)];
        
        const variance = numbers.reduce((acc, num) => acc + Math.pow(num - mean, 2), 0) / numbers.length;
        const standardDeviation = Math.sqrt(variance);
        
        return {
            sum,
            mean: Math.round(mean * 100) / 100,
            median,
            min: Math.min(...numbers),
            max: Math.max(...numbers),
            range: Math.max(...numbers) - Math.min(...numbers),
            variance: Math.round(variance * 100) / 100,
            standardDeviation: Math.round(standardDeviation * 100) / 100
        };
    },

    // Performance tracking
    trackPerformance: function(operation, startTime) {
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
    },

    // Error handling
    handleApiError: function(error, context = 'API') {
        console.error(`${context} Error:`, error);
        
        if (window.performanceMetrics) {
            window.performanceMetrics.errors++;
        }
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return window.LOTTERY_CONFIG.ERROR_MESSAGES.NETWORK_ERROR;
        }
        
        if (error.status === 401 || error.status === 403) {
            return window.LOTTERY_CONFIG.ERROR_MESSAGES.INVALID_API_KEY;
        }
        
        if (error.status >= 500) {
            return window.LOTTERY_CONFIG.ERROR_MESSAGES.API_ERROR;
        }
        
        return error.message || `${context} operation failed. Please try again.`;
    },

    // Utility functions
    generateRandomNumbers: function(min, max, count, exclude = []) {
        const numbers = [];
        const available = [];
        
        for (let i = min; i <= max; i++) {
            if (!exclude.includes(i)) {
                available.push(i);
            }
        }
        
        if (available.length < count) {
            throw new Error('Not enough available numbers to generate the requested count');
        }
        
        while (numbers.length < count) {
            const randomIndex = Math.floor(Math.random() * available.length);
            const number = available.splice(randomIndex, 1)[0];
            numbers.push(number);
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

    // Local storage utilities
    saveToStorage: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    },

    loadFromStorage: function(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return defaultValue;
        }
    },

    clearStorage: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
            return false;
        }
    }
};

// Make helper functions available globally
window.formatCurrency = window.LotteryHelpers.formatCurrency;
window.formatNumber = window.LotteryHelpers.formatNumber;
window.formatPercentage = window.LotteryHelpers.formatPercentage;
window.formatDate = window.LotteryHelpers.formatDate;
window.validateLotteryNumbers = window.LotteryHelpers.validateLotteryNumbers;
window.validatePowerball = window.LotteryHelpers.validatePowerball;
window.validateApiKey = window.LotteryHelpers.validateApiKey;
window.processHistoricalData = window.LotteryHelpers.processHistoricalData;
window.calculateStatistics = window.LotteryHelpers.calculateStatistics;
window.trackPerformance = window.LotteryHelpers.trackPerformance;
window.handleApiError = window.LotteryHelpers.handleApiError;
window.generateRandomNumbers = window.LotteryHelpers.generateRandomNumbers;
window.shuffleArray = window.LotteryHelpers.shuffleArray;
window.debounce = window.LotteryHelpers.debounce;
window.throttle = window.LotteryHelpers.throttle;
window.saveToStorage = window.LotteryHelpers.saveToStorage;
window.loadFromStorage = window.LotteryHelpers.loadFromStorage;
window.clearStorage = window.LotteryHelpers.clearStorage;