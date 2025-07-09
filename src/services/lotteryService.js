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
                error: window.handleApiError(error, 'Lottery Service Initialization')
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
                this.historicalData = window.processHistoricalData(historyResult.data);
                this.saveCachedData('historicalData', this.historicalData);
            }

            window.trackPerformance('lottery_data_refresh', startTime);

            return {
                success: true,
                current: currentResult.success,
                history: historyResult.success
            };
        } catch (error) {
            window.trackPerformance('lottery_data_refresh_error', startTime);
            throw error;
        }
    }

    loadCachedData() {
        this.currentDrawing = window.loadFromStorage('lottery_current_drawing');
        this.historicalData = window.loadFromStorage('lottery_historical_data');
        this.userSelections = window.loadFromStorage('lottery_user_selections', []);
        this.generatedSets = window.loadFromStorage('lottery_generated_sets', []);
    }

    saveCachedData(key, data) {
        window.saveToStorage(`lottery_${key}`, data);
    }

    // Number generation methods
    generateNumbers(algorithm = 'hybrid', count = 5) {
        try {
            const startTime = performance.now();
            
            if (!this.algorithms.algorithms[algorithm]) {
                throw new Error(`Unknown algorithm: ${algorithm}`);
            }

            const results = this.algorithms.algorithms[algorithm](this.historicalData, count);
            
            // Add metadata
            const enhancedResults = results.map((result, index) => ({
                ...result,
                id: `${algorithm}_${Date.now()}_${index}`,
                timestamp: new Date().toISOString(),
                historicalMatch: this.checkHistoricalMatch(result.numbers, result.powerball)
            }));

            // Cache the generated sets
            this.generatedSets = [...enhancedResults, ...this.generatedSets].slice(0, 50);
            this.saveCachedData('generatedSets', this.generatedSets);

            window.trackPerformance(`generate_${algorithm}`, startTime);

            return {
                success: true,
                data: enhancedResults
            };
        } catch (error) {
            console.error('Failed to generate numbers:', error);
            return {
                success: false,
                error: window.handleApiError(error, 'Number Generation')
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

        try {
            const results = this.algorithms.generateAdvancedQuickSelection(this.historicalData);
            
            const enhancedResults = results.map((result, index) => ({
                ...result,
                id: `advanced_${Date.now()}_${index}`,
                timestamp: new Date().toISOString(),
                historicalMatch: this.checkHistoricalMatch(result.numbers, result.powerball)
            }));

            return {
                success: true,
                data: enhancedResults
            };
        } catch (error) {
            console.error('Failed to generate advanced selection:', error);
            return this.generateNumbers('hybrid', 5);
        }
    }

    // User selection management
    saveUserSelection(numbers, powerball, name = null) {
        const validation = this.validateSelection(numbers, powerball);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }

        const selection = {
            id: `user_${Date.now()}`,
            numbers: [...numbers].sort((a, b) => a - b),
            powerball,
            name: name || `Selection ${this.userSelections.length + 1}`,
            timestamp: new Date().toISOString(),
            historicalMatch: this.checkHistoricalMatch(numbers, powerball)
        };

        this.userSelections.unshift(selection);
        this.userSelections = this.userSelections.slice(0, 20); // Keep last 20
        this.saveCachedData('userSelections', this.userSelections);

        return {
            success: true,
            data: selection
        };
    }

    deleteUserSelection(id) {
        const index = this.userSelections.findIndex(sel => sel.id === id);
        if (index === -1) {
            return {
                success: false,
                error: 'Selection not found'
            };
        }

        this.userSelections.splice(index, 1);
        this.saveCachedData('userSelections', this.userSelections);

        return { success: true };
    }

    getUserSelections() {
        return this.userSelections;
    }

    // Validation methods
    validateSelection(numbers, powerball) {
        const numberValidation = window.validateLotteryNumbers(numbers);
        if (!numberValidation.valid) {
            return numberValidation;
        }

        const powerballValidation = window.validatePowerball(powerball);
        if (!powerballValidation.valid) {
            return powerballValidation;
        }

        return { valid: true };
    }

    // Analysis methods
    analyzeNumbers(numbers, powerball) {
        if (!this.historicalData) {
            return {
                success: false,
                error: 'Historical data not available'
            };
        }

        try {
            const analysis = {
                numbers: [...numbers].sort((a, b) => a - b),
                powerball,
                statistics: window.calculateStatistics(numbers),
                frequency: this.analyzeFrequency(numbers, powerball),
                patterns: this.analyzePatterns(numbers),
                historicalMatch: this.checkHistoricalMatch(numbers, powerball),
                recommendations: this.generateRecommendations(numbers, powerball)
            };

            return {
                success: true,
                data: analysis
            };
        } catch (error) {
            console.error('Failed to analyze numbers:', error);
            return {
                success: false,
                error: window.handleApiError(error, 'Number Analysis')
            };
        }
    }

    analyzeFrequency(numbers, powerball) {
        if (!this.historicalData) return null;

        const numberFreqs = numbers.map(num => ({
            number: num,
            frequency: this.historicalData.numberFrequency[num] || 0,
            percentile: this.calculatePercentile(this.historicalData.numberFrequency[num] || 0, this.historicalData.numberFrequency)
        }));

        const powerballFreq = {
            number: powerball,
            frequency: this.historicalData.powerballFrequency[powerball] || 0,
            percentile: this.calculatePercentile(this.historicalData.powerballFrequency[powerball] || 0, this.historicalData.powerballFrequency)
        };

        return {
            numbers: numberFreqs,
            powerball: powerballFreq,
            averageFrequency: this.historicalData.averageFrequency,
            totalDrawings: this.historicalData.totalDrawings
        };
    }

    analyzePatterns(numbers) {
        const sortedNumbers = [...numbers].sort((a, b) => a - b);
        
        return {
            consecutive: this.findConsecutiveNumbers(sortedNumbers),
            evenOdd: this.analyzeEvenOdd(sortedNumbers),
            decades: this.analyzeDecades(sortedNumbers),
            sum: sortedNumbers.reduce((a, b) => a + b, 0),
            range: Math.max(...sortedNumbers) - Math.min(...sortedNumbers),
            gaps: this.calculateGaps(sortedNumbers)
        };
    }

    checkHistoricalMatch(numbers, powerball) {
        if (!this.historicalData || !this.historicalData.drawings) {
            return { found: false };
        }

        const sortedNumbers = [...numbers].sort((a, b) => a - b);
        
        // Check for exact matches
        const exactMatch = this.historicalData.drawings.find(drawing => {
            if (!drawing.numbers || drawing.powerball !== powerball) return false;
            
            const drawingNumbers = [...drawing.numbers].sort((a, b) => a - b);
            return JSON.stringify(sortedNumbers) === JSON.stringify(drawingNumbers);
        });

        if (exactMatch) {
            return {
                found: true,
                type: 'exact',
                date: exactMatch.date,
                jackpot: exactMatch.jackpot
            };
        }

        // Check for partial matches (4+ numbers)
        const partialMatches = this.historicalData.drawings
            .map(drawing => {
                if (!drawing.numbers) return null;
                
                const matchingNumbers = sortedNumbers.filter(num => 
                    drawing.numbers.includes(num)
                ).length;
                
                const powerballMatch = drawing.powerball === powerball;
                
                if (matchingNumbers >= 4 || (matchingNumbers >= 3 && powerballMatch)) {
                    return {
                        date: drawing.date,
                        matchingNumbers,
                        powerballMatch,
                        jackpot: drawing.jackpot
                    };
                }
                
                return null;
            })
            .filter(match => match !== null)
            .slice(0, 5); // Top 5 matches

        return {
            found: partialMatches.length > 0,
            type: 'partial',
            matches: partialMatches
        };
    }

    // Helper methods
    calculatePercentile(value, data) {
        const values = Object.values(data).sort((a, b) => a - b);
        const index = values.indexOf(value);
        return index >= 0 ? (index / (values.length - 1)) * 100 : 0;
    }

    findConsecutiveNumbers(numbers) {
        const consecutive = [];
        let current = [];
        
        for (let i = 0; i < numbers.length; i++) {
            if (i === 0 || numbers[i] === numbers[i - 1] + 1) {
                current.push(numbers[i]);
            } else {
                if (current.length >= 2) {
                    consecutive.push([...current]);
                }
                current = [numbers[i]];
            }
        }
        
        if (current.length >= 2) {
            consecutive.push(current);
        }
        
        return consecutive;
    }

    analyzeEvenOdd(numbers) {
        const even = numbers.filter(num => num % 2 === 0).length;
        const odd = numbers.length - even;
        
        return {
            even,
            odd,
            ratio: `${even}:${odd}`,
            balanced: Math.abs(even - odd) <= 1
        };
    }

    analyzeDecades(numbers) {
        const decades = {
            '1-10': 0, '11-20': 0, '21-30': 0, '31-40': 0,
            '41-50': 0, '51-60': 0, '61-69': 0
        };
        
        numbers.forEach(num => {
            if (num <= 10) decades['1-10']++;
            else if (num <= 20) decades['11-20']++;
            else if (num <= 30) decades['21-30']++;
            else if (num <= 40) decades['31-40']++;
            else if (num <= 50) decades['41-50']++;
            else if (num <= 60) decades['51-60']++;
            else decades['61-69']++;
        });
        
        return decades;
    }

    calculateGaps(numbers) {
        const gaps = [];
        for (let i = 1; i < numbers.length; i++) {
            gaps.push(numbers[i] - numbers[i - 1]);
        }
        return gaps;
    }

    generateRecommendations(numbers, powerball) {
        const recommendations = [];
        
        if (!this.historicalData) {
            return recommendations;
        }

        // Frequency-based recommendations
        const lowFreqNumbers = numbers.filter(num => 
            (this.historicalData.numberFrequency[num] || 0) < this.historicalData.averageFrequency * 0.8
        );
        
        if (lowFreqNumbers.length > 3) {
            recommendations.push({
                type: 'warning',
                message: `${lowFreqNumbers.length} numbers (${lowFreqNumbers.join(', ')}) appear less frequently than average`
            });
        }

        // Pattern recommendations
        const patterns = this.analyzePatterns(numbers);
        
        if (patterns.consecutive.length > 0) {
            recommendations.push({
                type: 'info',
                message: `Contains consecutive numbers: ${patterns.consecutive.map(seq => seq.join('-')).join(', ')}`
            });
        }

        if (!patterns.evenOdd.balanced) {
            recommendations.push({
                type: 'suggestion',
                message: `Consider balancing even/odd numbers (current: ${patterns.evenOdd.ratio})`
            });
        }

        return recommendations;
    }

    // Data getters
    getCurrentDrawing() {
        return this.currentDrawing;
    }

    getHistoricalData() {
        return this.historicalData;
    }

    getGeneratedSets() {
        return this.generatedSets;
    }

    // Statistics
    getServiceStats() {
        return {
            historicalDataAvailable: !!this.historicalData,
            currentDrawingAvailable: !!this.currentDrawing,
            totalUserSelections: this.userSelections.length,
            totalGeneratedSets: this.generatedSets.length,
            lastDataRefresh: this.historicalData?.lastUpdated || null
        };
    }
};

// Create global instance
window.lotteryService = new window.LotteryService();