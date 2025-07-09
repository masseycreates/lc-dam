// Advanced Lottery Intelligence System - Lottery Service
// Global lottery service for managing lottery operations and data

window.LotteryService = class {
    constructor() {
        this.algorithms = new window.LotteryAlgorithms();
        this.historicalData = null;
        this.currentDrawing = null;
        this.userSelections = [];
        this.generatedSets = [];
    }

    // Safe helper function wrappers
    safeTrackPerformance(operation, startTime) {
        try {
            if (typeof window.trackPerformance === 'function') {
                window.trackPerformance(operation, startTime);
            } else if (window.LotteryHelpers && typeof window.LotteryHelpers.trackPerformance === 'function') {
                window.LotteryHelpers.trackPerformance(operation, startTime);
            }
        } catch (error) {
            console.warn('Failed to track performance:', error);
        }
    }

    safeHandleApiError(error, context) {
        try {
            if (typeof window.handleApiError === 'function') {
                return window.handleApiError(error, context);
            } else if (window.LotteryHelpers && typeof window.LotteryHelpers.handleApiError === 'function') {
                return window.LotteryHelpers.handleApiError(error, context);
            } else {
                return error.message || 'Unknown error';
            }
        } catch (e) {
            return error.message || 'Unknown error';
        }
    }

    safeLoadFromStorage(key) {
        try {
            if (typeof window.loadFromStorage === 'function') {
                return window.loadFromStorage(key);
            } else if (window.LotteryHelpers && typeof window.LotteryHelpers.loadFromStorage === 'function') {
                return window.LotteryHelpers.loadFromStorage(key);
            } else {
                return null;
            }
        } catch (error) {
            console.warn('Failed to load from storage:', error);
            return null;
        }
    }

    safeSaveToStorage(key, data) {
        try {
            if (typeof window.saveToStorage === 'function') {
                return window.saveToStorage(key, data);
            } else if (window.LotteryHelpers && typeof window.LotteryHelpers.saveToStorage === 'function') {
                return window.LotteryHelpers.saveToStorage(key, data);
            } else {
                return false;
            }
        } catch (error) {
            console.warn('Failed to save to storage:', error);
            return false;
        }
    }

    safeProcessHistoricalData(rawData) {
        try {
            if (typeof window.processHistoricalData === 'function') {
                return window.processHistoricalData(rawData);
            } else if (window.LotteryHelpers && typeof window.LotteryHelpers.processHistoricalData === 'function') {
                return window.LotteryHelpers.processHistoricalData(rawData);
            } else {
                // Fallback basic processing
                return {
                    drawings: Array.isArray(rawData) ? rawData : [],
                    numberFrequency: {},
                    powerballFrequency: {},
                    hotNumbers: [],
                    coldNumbers: [],
                    patterns: []
                };
            }
        } catch (error) {
            console.warn('Failed to process historical data:', error);
            return {
                drawings: [],
                numberFrequency: {},
                powerballFrequency: {},
                hotNumbers: [],
                coldNumbers: [],
                patterns: []
            };
        }
    }

    // Initialize the service
    async initialize() {
        try {
            // Load cached data first
            this.loadCachedData();
            
            // Fetch fresh data in background
            await this.refreshData();
            
            return { success: true };
        } catch (error) {
            console.error('Failed to initialize lottery service:', error);
            return { 
                success: false, 
                error: this.safeHandleApiError(error, 'Lottery Service Initialization')
            };
        }
    }

    // Load cached data
    loadCachedData() {
        this.currentDrawing = this.safeLoadFromStorage('currentDrawing');
        this.historicalData = this.safeLoadFromStorage('historicalData');
        this.userSelections = this.safeLoadFromStorage('userSelections') || [];
        this.generatedSets = this.safeLoadFromStorage('generatedSets') || [];
    }

    // Save cached data
    saveCachedData(key, data) {
        this.safeSaveToStorage(key, data);
    }

    // Refresh data from API
    async refreshData() {
        try {
            const startTime = performance.now();
            
            if (!window.apiService) {
                throw new Error('API service not available');
            }

            // Fetch current drawing data
            const currentResult = await window.apiService.fetchPowerballData();
            if (currentResult.success) {
                this.currentDrawing = currentResult.data;
                this.saveCachedData('currentDrawing', this.currentDrawing);
            }

            // Fetch historical data
            const historicalResult = await window.apiService.fetchHistoricalData();
            if (historicalResult.success) {
                this.historicalData = this.safeProcessHistoricalData(historicalResult.data);
                this.saveCachedData('historicalData', this.historicalData);
            }

            this.safeTrackPerformance('refresh_data', startTime);
            return { success: true };
        } catch (error) {
            console.error('Failed to refresh data:', error);
            return { 
                success: false, 
                error: this.safeHandleApiError(error, 'Data Refresh')
            };
        }
    }

    // Generate numbers using selected algorithm
    async generateNumbers(algorithm = 'hybrid', count = 5) {
        try {
            const startTime = performance.now();
            
            let algorithmResults;
            
            // Get results from the selected algorithm
            const algorithmFunction = this.algorithms.getAlgorithm(algorithm);
            algorithmResults = algorithmFunction(this.historicalData, count);

            // Ensure we have an array of results
            if (!Array.isArray(algorithmResults)) {
                algorithmResults = [algorithmResults];
            }

            // Enhance results with metadata
            const enhancedResults = algorithmResults.map((result, index) => ({
                ...result,
                id: `${algorithm}_${Date.now()}_${index}`,
                timestamp: new Date().toISOString(),
                historicalMatch: this.checkHistoricalMatch(result.numbers, result.powerball)
            }));

            // Cache the generated sets
            this.generatedSets = [...enhancedResults, ...this.generatedSets].slice(0, 50);
            this.safeSaveToStorage('generatedSets', this.generatedSets);

            this.safeTrackPerformance(`generate_${algorithm}`, startTime);

            return {
                success: true,
                data: enhancedResults
            };
        } catch (error) {
            console.error('Failed to generate numbers:', error);
            this.safeHandleApiError(error, 'Number Generation');
            return {
                success: false,
                error: error.message
            };
        }
    }

    generateQuickPick() {
        return this.generateNumbers('random', 1);
    }

    generateAdvancedSelection() {
        if (!this.historicalData) {
            return this.generateNumbers('random', 5);
        }
        
        return this.generateNumbers('hybrid', 3);
    }

    // Historical analysis
    checkHistoricalMatch(numbers, powerball) {
        if (!this.historicalData || !this.historicalData.drawings) {
            return { exactMatch: false, partialMatches: 0 };
        }

        // Ensure numbers is an array and contains valid numbers
        if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
            return { exactMatch: false, partialMatches: 0 };
        }

        const sortedNumbers = [...numbers].sort((a, b) => a - b);
        let exactMatch = false;
        let partialMatches = 0;

        this.historicalData.drawings.forEach(drawing => {
            if (drawing.numbers && drawing.powerball) {
                const drawingNumbers = [...drawing.numbers].sort((a, b) => a - b);
                
                // Check for exact match
                if (JSON.stringify(sortedNumbers) === JSON.stringify(drawingNumbers) && 
                    powerball === drawing.powerball) {
                    exactMatch = true;
                }

                // Count partial matches (3+ numbers match)
                const matchingNumbers = sortedNumbers.filter(num => drawingNumbers.includes(num));
                if (matchingNumbers.length >= 3) {
                    partialMatches++;
                }
            }
        });

        return { exactMatch, partialMatches };
    }

    // Save user selection
    saveUserSelection(numbers, powerball) {
        try {
            const selection = {
                id: `user_${Date.now()}`,
                numbers: [...numbers].sort((a, b) => a - b),
                powerball,
                timestamp: new Date().toISOString(),
                historicalMatch: this.checkHistoricalMatch(numbers, powerball)
            };

            this.userSelections.unshift(selection);
            this.userSelections = this.userSelections.slice(0, 20); // Keep only last 20
            this.saveCachedData('userSelections', this.userSelections);

            return { success: true, data: selection };
        } catch (error) {
            return { 
                success: false, 
                error: this.safeHandleApiError(error, 'Save User Selection')
            };
        }
    }

    // Delete user selection
    deleteUserSelection(id) {
        try {
            this.userSelections = this.userSelections.filter(selection => selection.id !== id);
            this.saveCachedData('userSelections', this.userSelections);
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: this.safeHandleApiError(error, 'Delete User Selection')
            };
        }
    }

    // Analyze numbers
    async analyzeNumbers(numbers, powerball) {
        try {
            const startTime = performance.now();
            
            const analysis = {
                numbers: [...numbers].sort((a, b) => a - b),
                powerball,
                historicalMatch: this.checkHistoricalMatch(numbers, powerball),
                frequency: this.analyzeFrequency(numbers, powerball),
                patterns: this.analyzePatterns(numbers),
                odds: this.calculateOdds(numbers, powerball),
                timestamp: new Date().toISOString()
            };

            this.safeTrackPerformance('analyze_numbers', startTime);
            return { success: true, data: analysis };
        } catch (error) {
            return { 
                success: false, 
                error: this.safeHandleApiError(error, 'Number Analysis')
            };
        }
    }

    // Analyze frequency
    analyzeFrequency(numbers, powerball) {
        if (!this.historicalData || !this.historicalData.numberFrequency) {
            return { numbers: [], powerball: 0 };
        }

        const numberFreqs = numbers.map(num => ({
            number: num,
            frequency: this.historicalData.numberFrequency[num] || 0
        }));

        const powerballFreq = this.historicalData.powerballFrequency[powerball] || 0;

        return {
            numbers: numberFreqs,
            powerball: powerballFreq
        };
    }

    // Analyze patterns
    analyzePatterns(numbers) {
        const sorted = [...numbers].sort((a, b) => a - b);
        
        return {
            consecutive: this.hasConsecutiveNumbers(sorted),
            evenOddRatio: this.getEvenOddRatio(numbers),
            highLowRatio: this.getHighLowRatio(numbers),
            sum: numbers.reduce((a, b) => a + b, 0),
            spread: Math.max(...numbers) - Math.min(...numbers)
        };
    }

    // Calculate odds
    calculateOdds(numbers, powerball) {
        return {
            jackpot: window.LOTTERY_CONFIG.POWERBALL.JACKPOT_ODDS,
            anyPrize: 24.9 // Approximate odds for any prize
        };
    }

    // Helper methods
    hasConsecutiveNumbers(sortedNumbers) {
        for (let i = 0; i < sortedNumbers.length - 1; i++) {
            if (sortedNumbers[i + 1] - sortedNumbers[i] === 1) {
                return true;
            }
        }
        return false;
    }

    getEvenOddRatio(numbers) {
        const even = numbers.filter(n => n % 2 === 0).length;
        const odd = numbers.length - even;
        return { even, odd };
    }

    getHighLowRatio(numbers) {
        const high = numbers.filter(n => n > 35).length;
        const low = numbers.length - high;
        return { high, low };
    }

    // Getters
    getCurrentDrawing() {
        return this.currentDrawing;
    }

    getHistoricalData() {
        return this.historicalData;
    }

    getUserSelections() {
        return this.userSelections;
    }

    getGeneratedSets() {
        return this.generatedSets;
    }

    // Clear all data
    clearAllData() {
        this.currentDrawing = null;
        this.historicalData = null;
        this.userSelections = [];
        this.generatedSets = [];
        
        // Clear storage
        this.saveCachedData('currentDrawing', this.currentDrawing);
        this.saveCachedData('historicalData', this.historicalData);
        this.saveCachedData('userSelections', this.userSelections);
        this.saveCachedData('generatedSets', this.generatedSets);
    }
};

// Create global instance
window.lotteryService = new window.LotteryService();