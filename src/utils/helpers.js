// Utility functions for formatting, validation, and common operations
export const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

export const formatNumber = (number) => {
    if (typeof number !== 'number' || isNaN(number)) return '0';
    return new Intl.NumberFormat('en-US').format(number);
};

export const formatPercentage = (decimal) => {
    if (typeof decimal !== 'number' || isNaN(decimal)) return '0%';
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 2
    }).format(decimal / 100);
};

export const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid Date';
    }
};

export const formatDateTime = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid Date';
    }
};

// Validation functions
export const validateLotteryNumbers = (numbers) => {
    if (!Array.isArray(numbers) || numbers.length !== 5) {
        return { valid: false, error: 'Must have exactly 5 numbers' };
    }

    for (const num of numbers) {
        if (!Number.isInteger(num) || num < 1 || num > 69) {
            return { valid: false, error: 'Numbers must be integers between 1 and 69' };
        }
    }

    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== 5) {
        return { valid: false, error: 'All numbers must be unique' };
    }

    return { valid: true };
};

export const validatePowerball = (powerball) => {
    if (!Number.isInteger(powerball) || powerball < 1 || powerball > 26) {
        return { valid: false, error: 'Powerball must be an integer between 1 and 26' };
    }
    return { valid: true };
};

export const validateApiKey = (apiKey) => {
    if (!apiKey || typeof apiKey !== 'string') {
        return { valid: false, error: 'API key is required' };
    }

    if (apiKey.length < 10) {
        return { valid: false, error: 'API key appears to be too short' };
    }

    // Basic format validation for Claude API keys
    if (!apiKey.startsWith('sk-ant-')) {
        return { valid: false, error: 'Invalid Claude API key format' };
    }

    return { valid: true };
};

// Data processing utilities
export const processHistoricalData = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) {
        return null;
    }

    const numberFrequency = {};
    const powerballs = {};
    const recentDrawings = [];

    rawData.forEach(drawing => {
        if (drawing.numbers && Array.isArray(drawing.numbers)) {
            // Process main numbers
            drawing.numbers.forEach(num => {
                numberFrequency[num] = (numberFrequency[num] || 0) + 1;
            });

            // Process powerball
            if (drawing.powerball) {
                powerballs[drawing.powerball] = (powerballs[drawing.powerball] || 0) + 1;
            }

            // Add to recent drawings
            recentDrawings.push({
                date: drawing.date,
                numbers: drawing.numbers,
                powerball: drawing.powerball
            });
        }
    });

    return {
        numberFrequency,
        powerballs,
        recentDrawings: recentDrawings.slice(0, 100), // Keep last 100 drawings
        totalDrawings: rawData.length,
        dateRange: {
            from: rawData[rawData.length - 1]?.date,
            to: rawData[0]?.date
        }
    };
};

export const calculateStatistics = (historicalData) => {
    if (!historicalData) return null;

    const { numberFrequency, powerballs, totalDrawings } = historicalData;

    // Find most/least frequent numbers
    const sortedNumbers = Object.entries(numberFrequency)
        .sort(([,a], [,b]) => b - a)
        .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }));

    const mostFrequent = sortedNumbers.slice(0, 10);
    const leastFrequent = sortedNumbers.slice(-10);

    // Calculate averages
    const avgFrequency = Object.values(numberFrequency).reduce((sum, freq) => sum + freq, 0) / Object.keys(numberFrequency).length;

    return {
        mostFrequent,
        leastFrequent,
        avgFrequency,
        totalDrawings,
        uniqueNumbers: Object.keys(numberFrequency).length,
        uniquePowerballs: Object.keys(powerballs).length
    };
};

// Performance tracking utilities
export const trackPerformance = (operation, startTime) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Performance: ${operation} took ${duration.toFixed(2)}ms`);
    
    return {
        operation,
        duration,
        timestamp: new Date().toISOString()
    };
};

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const throttle = (func, limit) => {
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
};

// Local storage utilities
export const saveToLocalStorage = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        return false;
    }
};

export const loadFromLocalStorage = (key, defaultValue = null) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return defaultValue;
    }
};

export const removeFromLocalStorage = (key) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Failed to remove from localStorage:', error);
        return false;
    }
};

// Error handling utilities
export const handleApiError = (error, context = 'API') => {
    console.error(`${context} Error:`, error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return 'Network error: Please check your internet connection';
    }
    
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return 'Authentication error: Please check your API key';
    }
    
    if (error.message.includes('429') || error.message.includes('rate limit')) {
        return 'Rate limit exceeded: Please wait before making another request';
    }
    
    if (error.message.includes('500') || error.message.includes('internal server')) {
        return 'Server error: Please try again later';
    }
    
    return error.message || 'An unexpected error occurred';
};

// Number generation utilities
export const generateRandomNumbers = (min, max, count, exclude = []) => {
    const numbers = [];
    const excludeSet = new Set(exclude);
    
    while (numbers.length < count) {
        const num = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!numbers.includes(num) && !excludeSet.has(num)) {
            numbers.push(num);
        }
    }
    
    return numbers.sort((a, b) => a - b);
};

export const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// Constants
export const LOTTERY_CONSTANTS = {
    MAIN_NUMBER_MIN: 1,
    MAIN_NUMBER_MAX: 69,
    MAIN_NUMBER_COUNT: 5,
    POWERBALL_MIN: 1,
    POWERBALL_MAX: 26,
    JACKPOT_ODDS: 292201338,
    MATCH_5_ODDS: 11688053,
    MATCH_4_POWERBALL_ODDS: 913129,
    MATCH_4_ODDS: 36525,
    MATCH_3_POWERBALL_ODDS: 14494,
    MATCH_3_ODDS: 579,
    MATCH_2_POWERBALL_ODDS: 701,
    MATCH_1_POWERBALL_ODDS: 92,
    POWERBALL_ONLY_ODDS: 38
};

export default {
    formatCurrency,
    formatNumber,
    formatPercentage,
    formatDate,
    formatDateTime,
    validateLotteryNumbers,
    validatePowerball,
    validateApiKey,
    processHistoricalData,
    calculateStatistics,
    trackPerformance,
    debounce,
    throttle,
    saveToLocalStorage,
    loadFromLocalStorage,
    removeFromLocalStorage,
    handleApiError,
    generateRandomNumbers,
    shuffleArray,
    LOTTERY_CONSTANTS
};