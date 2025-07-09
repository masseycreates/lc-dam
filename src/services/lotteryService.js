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
            console.warn('Performance tracking failed:', error);
        }
    }

    safeHandleApiError(error, context) {
        try {
            if (typeof window.handleApiError === 'function') {
                return window.handleApiError(error, context);
            } else if (window.LotteryHelpers && typeof window.LotteryHelpers.handleApiError === 'function') {
                return window.LotteryHelpers.handleApiError(error, context);
            } else {
                return error.message || 'An unexpected error occurred';
            }
        } catch (e) {
            return error.message || 'An unexpected error occurred';
        }
    }

    safeLoadFromStorage(key, defaultValue = null) {
        try {
            if (typeof window.loadFromStorage === 'function') {
                return window.loadFromStorage(key, defaultValue);
            } else if (window.LotteryHelpers && typeof window.LotteryHelpers.loadFromStorage === 'function') {
                return window.LotteryHelpers.loadFromStorage(key, defaultValue);
            } else {
                return defaultValue;
            }
        } catch (error) {
            console.warn('Failed to load from storage:', error);
            return defaultValue;
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
                    hotPowerballs: [],
                    coldPowerballs: [],
                    totalDrawings: Array.isArray(rawData) ? rawData.length : 0,
                    averageFrequency: 0,
                    lastUpdated: new Date().toISOString()
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
                hotPowerballs: [],
                coldPowerballs: [],
                totalDrawings: 0,
                averageFrequency: 0,
                lastUpdated: new Date().toISOString()
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

    // Data management methods
    async refreshData() {
        const startTime = performance.now();
        
        try {
            // Fetch current drawing and history in parallel
            const [currentResult, historyResult] = await Promise.all([
                window.apiService.getCachedPowerball(),
                window.apiService.getCachedPowerballHistory(200)
            ]);

            if (currentResult.success) {
                this.currentDrawing = currentResult.data;
                this.saveCachedData('currentDrawing', this.currentDrawing);
            }

            if (historyResult.success) {
                this.historicalData = this.safeProcessHistoricalData(historyResult.data);
                this.saveCachedData('historicalData', this.historicalData);
            }

            this.safeTrackPerformance('lottery_data_refresh', startTime);

            return {
                success: true,
                current: currentResult.success,
                history: historyResult.success
            };
        } catch (error) {
            this.safeTrackPerformance('lottery_data_refresh_error', startTime);
            throw error;
        }
    }

    loadCachedData() {
        this.currentDrawing = this.safeLoadFromStorage('lottery_current_drawing');
        this.historicalData = this.safeLoadFromStorage('lottery_historical_data');
        this.userSelections = this.safeLoadFromStorage('lottery_user_selections', []);
        this.generatedSets = this.safeLoadFromStorage('lottery_generated_sets', []);
    }

    saveCachedData(key, data) {
        this.safeSaveToStorage(`lottery_${key}`, data);
    }

    // Number generation methods
    async generateNumbers(algorithm = 'hybrid', count = 5) {
        const startTime = performance.now();
        
        try {
            if (!this.algorithms) {
                throw new Error('Lottery algorithms not available');
            try {
                const startTime = performance.now();

                let algorithmResults;

                // Get results from the selected algorithm
                switch (algorithm) {
                    case 'frequency':
                        algorithmResults = this.algorithms.frequency(this.historicalData, count);
                        break;
                    case 'hot-cold':
                    case 'hot_cold':
                        algorithmResults = this.algorithms.hot_cold(this.historicalData, count);
                        break;
                    case 'pattern':
                        algorithmResults = this.algorithms.pattern(this.historicalData, count);
                        break;
                    case 'statistical':
                        algorithmResults = this.algorithms.statistical(this.historicalData, count);
                        break;
                    case 'random':
                        algorithmResults = this.algorithms.random(this.historicalStats, count);
                        break;
                    case 'hybrid':
                    default:
                        algorithmResults = this.algorithms.hybrid(this.historicalData, count);
                        break;
                }

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

    // User selection management
    addUserSelection(numbers, powerball) {
        const selection = {
            id: `user_${Date.now()}`,
            numbers: [...numbers].sort((a, b) => a - b),
            powerball,
            timestamp: new Date().toISOString(),
            type: 'user',
            historicalMatch: this.checkHistoricalMatch(numbers, powerball)
        };

        this.userSelections = [selection, ...this.userSelections].slice(0, 20);
        this.saveCachedData('userSelections', this.userSelections);

        return selection;
    }

    removeUserSelection(id) {
        this.userSelections = this.userSelections.filter(selection => selection.id !== id);
        this.saveCachedData('userSelections', this.userSelections);
    }

    clearUserSelections() {
        this.userSelections = [];
        this.saveCachedData('userSelections', this.userSelections);
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

    analyzeNumbers(numbers, powerball) {
        try {
            if (!this.historicalData) {
                return {
                    success: false,
                    error: 'Historical data not available'
                };
            }

            const analysis = {
                numbers: [...numbers].sort((a, b) => a - b),
                powerball,
                timestamp: new Date().toISOString()
            };

            // Basic statistics
            const sum = numbers.reduce((acc, num) => acc + num, 0);
            analysis.sum = sum;
            analysis.average = Math.round((sum / numbers.length) * 100) / 100;
            analysis.range = Math.max(...numbers) - Math.min(...numbers);
            analysis.evenCount = numbers.filter(num => num % 2 === 0).length;
            analysis.oddCount = numbers.length - analysis.evenCount;

            // Frequency analysis
            analysis.frequencies = numbers.map(num => ({
                number: num,
                frequency: this.historicalData.numberFrequency[num] || 0,
                isHot: this.historicalData.hotNumbers.some(hot => hot.number === num),
                isCold: this.historicalData.coldNumbers.some(cold => cold.number === num)
            }));

            analysis.powerballFrequency = this.historicalData.powerballFrequency[powerball] || 0;
            analysis.powerballIsHot = this.historicalData.hotPowerballs.some(hot => hot.number === powerball);
            analysis.powerballIsCold = this.historicalData.coldPowerballs.some(cold => cold.number === powerball);

            // Historical matches
            analysis.historicalMatch = this.checkHistoricalMatch(numbers, powerball);

            // Pattern analysis
            analysis.consecutiveNumbers = this.findConsecutiveNumbers(numbers);
            analysis.numberGroups = this.analyzeNumberGroups(numbers);

            return {
                success: true,
                data: analysis
            };
        } catch (error) {
            console.error('Failed to analyze numbers:', error);
            return {
                success: false,
                error: this.safeHandleApiError(error, 'Number Analysis')
            };
        }
    }

    findConsecutiveNumbers(numbers) {
        const sorted = [...numbers].sort((a, b) => a - b);
        const consecutive = [];
        let current = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === sorted[i - 1] + 1) {
                current.push(sorted[i]);
            } else {
                if (current.length > 1) {
                    consecutive.push([...current]);
                }
                current = [sorted[i]];
            }
        }

        if (current.length > 1) {
            consecutive.push(current);
        }

        return consecutive;
    }

    analyzeNumberGroups(numbers) {
        const groups = {
            low: numbers.filter(num => num >= 1 && num <= 23).length,
            mid: numbers.filter(num => num >= 24 && num <= 46).length,
            high: numbers.filter(num => num >= 47 && num <= 69).length
        };

        return groups;
    }

    // Data getters
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

    // Statistics and insights
    getStatistics() {
        if (!this.historicalData) {
            return null;
        }

        return {
            totalDrawings: this.historicalData.totalDrawings,
            averageFrequency: this.historicalData.averageFrequency,
            hotNumbers: this.historicalData.hotNumbers.slice(0, 10),
            coldNumbers: this.historicalData.coldNumbers.slice(0, 10),
            hotPowerballs: this.historicalData.hotPowerballs.slice(0, 5),
            coldPowerballs: this.historicalData.coldPowerballs.slice(0, 5),
            lastUpdated: this.historicalData.lastUpdated
        };
    }

    getInsights() {
        if (!this.historicalData || !this.historicalData.drawings.length) {
            return [];
        }

        const insights = [];
        const recent = this.historicalData.drawings.slice(0, 10);

        // Most frequent recent numbers
        const recentNumbers = {};
        recent.forEach(drawing => {
            if (drawing.numbers) {
                drawing.numbers.forEach(num => {
                    recentNumbers[num] = (recentNumbers[num] || 0) + 1;
                });
            }
        });

        const mostFrequentRecent = Object.entries(recentNumbers)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }));

        if (mostFrequentRecent.length > 0) {
            insights.push({
                type: 'frequent_recent',
                title: 'Most Frequent Recent Numbers',
                description: `Numbers ${mostFrequentRecent.map(n => n.number).join(', ')} have appeared most frequently in the last 10 drawings.`,
                data: mostFrequentRecent
            });
        }

        // Overdue numbers
        const overdueNumbers = this.historicalData.coldNumbers.slice(0, 5);
        if (overdueNumbers.length > 0) {
            insights.push({
                type: 'overdue',
                title: 'Overdue Numbers',
                description: `Numbers ${overdueNumbers.map(n => n.number).join(', ')} haven't appeared recently and might be due.`,
                data: overdueNumbers
            });
        }

        // Hot streak
        const hotNumbers = this.historicalData.hotNumbers.slice(0, 5);
        if (hotNumbers.length > 0) {
            insights.push({
                type: 'hot_streak',
                title: 'Hot Numbers',
                description: `Numbers ${hotNumbers.map(n => n.number).join(', ')} are currently on a hot streak.`,
                data: hotNumbers
            });
        }

        return insights;
    }

    // Utility methods
    clearAllData() {
        this.currentDrawing = null;
        this.historicalData = null;
        this.userSelections = [];
        this.generatedSets = [];
        
        // Clear storage
        ['currentDrawing', 'historicalData', 'userSelections', 'generatedSets'].forEach(key => {
            this.safeSaveToStorage(`lottery_${key}`, null);
        });
    }

    exportData() {
        return {
            currentDrawing: this.currentDrawing,
            historicalData: this.historicalData,
            userSelections: this.userSelections,
            generatedSets: this.generatedSets,
            exportedAt: new Date().toISOString()
        };
    }

    importData(data) {
        if (data.currentDrawing) this.currentDrawing = data.currentDrawing;
        if (data.historicalData) this.historicalData = data.historicalData;
        if (data.userSelections) this.userSelections = data.userSelections;
        if (data.generatedSets) this.generatedSets = data.generatedSets;

        // Save to storage
        this.saveCachedData('currentDrawing', this.currentDrawing);
        this.saveCachedData('historicalData', this.historicalData);
        this.saveCachedData('userSelections', this.userSelections);
        this.saveCachedData('generatedSets', this.generatedSets);
    }
};

// Create global instance
window.lotteryService = new window.LotteryService();