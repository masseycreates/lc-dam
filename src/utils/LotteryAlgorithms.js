// Advanced Lottery Intelligence System - Lottery Algorithms
// Global lottery algorithm implementations

window.LotteryAlgorithms = class {
    constructor() {
        this.algorithms = {
            frequency: this.frequencyAnalysis.bind(this),
            hot_cold: this.hotColdAnalysis.bind(this),
            pattern: this.patternAnalysis.bind(this),
            statistical: this.statisticalAnalysis.bind(this),
            random: this.randomSelection.bind(this),
            hybrid: this.hybridAnalysis.bind(this)
        };
    }

    // Get algorithm by name
    getAlgorithm(name) {
        return this.algorithms[name] || this.algorithms.hybrid;
    }

    // Frequency-based analysis
    frequencyAnalysis(historicalStats, count = 5) {
        if (!historicalStats || !historicalStats.numberFrequency) {
            return this.randomSelection(null, count);
        }

        const results = [];
        
        for (let i = 0; i < count; i++) {
            const numbers = this.selectByFrequency(historicalStats.numberFrequency, 5);
            const powerball = this.selectPowerballByFrequency(historicalStats.powerballFrequency);
            
            results.push({
                numbers,
                powerball,
                algorithm: 'frequency',
                confidence: this.calculateConfidence(historicalStats, numbers, powerball),
                description: 'Based on historical frequency patterns'
            });
        }
        
        return results;
    }

    // Hot and cold number analysis
    hotColdAnalysis(historicalStats, count = 5) {
        if (!historicalStats || !historicalStats.hotNumbers) {
            return this.randomSelection(null, count);
        }

        const results = [];
        
        for (let i = 0; i < count; i++) {
            const hotNumbers = historicalStats.hotNumbers.slice(0, 15).map(item => item.number);
            const coldNumbers = historicalStats.coldNumbers.slice(0, 15).map(item => item.number);
            
            // Mix hot and cold numbers
            const selectedHot = window.shuffleArray(hotNumbers).slice(0, 3);
            const selectedCold = window.shuffleArray(coldNumbers).slice(0, 2);
            const numbers = [...selectedHot, ...selectedCold].sort((a, b) => a - b);
            
            const hotPowerballs = historicalStats.hotPowerballs.map(item => item.number);
            const powerball = hotPowerballs[Math.floor(Math.random() * Math.min(5, hotPowerballs.length))];
            
            results.push({
                numbers,
                powerball,
                algorithm: 'hot_cold',
                confidence: this.calculateConfidence(historicalStats, numbers, powerball),
                description: 'Mix of trending and overdue numbers'
            });
        }
        
        return results;
    }

    // Pattern-based analysis
    patternAnalysis(historicalStats, count = 5) {
        if (!historicalStats) {
            return this.randomSelection(null, count);
        }

        const results = [];
        
        for (let i = 0; i < count; i++) {
            const numbers = this.generatePatternNumbers();
            const powerball = Math.floor(Math.random() * 26) + 1;
            
            results.push({
                numbers,
                powerball,
                algorithm: 'pattern',
                confidence: this.calculateConfidence(historicalStats, numbers, powerball),
                description: 'Based on number sequence patterns'
            });
        }
        
        return results;
    }

    // Statistical distribution analysis
    statisticalAnalysis(historicalStats, count = 5) {
        const results = [];
        
        for (let i = 0; i < count; i++) {
            const numbers = this.generateStatisticalNumbers();
            const powerball = this.generateStatisticalPowerball();
            
            results.push({
                numbers,
                powerball,
                algorithm: 'statistical',
                confidence: this.calculateConfidence(historicalStats, numbers, powerball),
                description: 'Mathematical probability distributions'
            });
        }
        
        return results;
    }

    // Pure random selection
    randomSelection(historicalStats, count = 5) {
        const results = [];
        
        for (let i = 0; i < count; i++) {
            const numbers = window.generateRandomNumbers(1, 69, 5);
            const powerball = Math.floor(Math.random() * 26) + 1;
            
            results.push({
                numbers,
                powerball,
                algorithm: 'random',
                confidence: 0.5, // Baseline confidence for random
                description: 'Pure random number generation'
            });
        }
        
        return results;
    }

    // Hybrid approach combining multiple algorithms
    hybridAnalysis(historicalStats, count = 5) {
        if (!historicalStats) {
            return this.randomSelection(null, count);
        }

        const results = [];
        
        for (let i = 0; i < count; i++) {
            // Get results from different algorithms
            const frequencyResult = this.frequencyAnalysis(historicalStats, 1)[0];
            const hotColdResult = this.hotColdAnalysis(historicalStats, 1)[0];
            const patternResult = this.patternAnalysis(historicalStats, 1)[0];
            const statisticalResult = this.statisticalAnalysis(historicalStats, 1)[0];
            
            // Combine and weight the results
            const combinedNumbers = this.combineAlgorithmResults([
                { numbers: frequencyResult.numbers, weight: 0.3 },
                { numbers: hotColdResult.numbers, weight: 0.25 },
                { numbers: patternResult.numbers, weight: 0.2 },
                { numbers: statisticalResult.numbers, weight: 0.25 }
            ]);
            
            const combinedPowerball = this.combinePowerballResults([
                { powerball: frequencyResult.powerball, weight: 0.4 },
                { powerball: hotColdResult.powerball, weight: 0.3 },
                { powerball: patternResult.powerball, weight: 0.15 },
                { powerball: statisticalResult.powerball, weight: 0.15 }
            ]);
            
            results.push({
                numbers: combinedNumbers,
                powerball: combinedPowerball,
                algorithm: 'hybrid',
                confidence: this.calculateHybridConfidence(historicalStats, combinedNumbers, combinedPowerball),
                description: 'Combined multi-algorithm approach'
            });
        }
        
        return results;
    }

    // Helper methods
    selectByFrequency(frequencyData, count) {
        const sortedNumbers = Object.entries(frequencyData)
            .sort(([,a], [,b]) => b - a)
            .map(([num]) => parseInt(num));
        
        // Select from top performers with some randomization
        const topNumbers = sortedNumbers.slice(0, Math.min(20, sortedNumbers.length));
        return window.shuffleArray(topNumbers).slice(0, count).sort((a, b) => a - b);
    }

    selectPowerballByFrequency(powerballFrequency) {
        const sortedPowerballs = Object.entries(powerballFrequency)
            .sort(([,a], [,b]) => b - a)
            .map(([num]) => parseInt(num));
        
        const topPowerballs = sortedPowerballs.slice(0, Math.min(8, sortedPowerballs.length));
        return topPowerballs[Math.floor(Math.random() * topPowerballs.length)];
    }

    generatePatternNumbers() {
        const patterns = [
            // Consecutive numbers
            () => {
                const start = Math.floor(Math.random() * 65) + 1;
                return Array.from({length: 5}, (_, i) => start + i);
            },
            // Arithmetic sequence
            () => {
                const start = Math.floor(Math.random() * 20) + 1;
                const step = Math.floor(Math.random() * 10) + 2;
                return Array.from({length: 5}, (_, i) => Math.min(69, start + i * step));
            },
            // Decade distribution
            () => {
                const decades = [
                    [1, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60], [61, 69]
                ];
                const numbers = [];
                const usedDecades = [];
                
                while (numbers.length < 5 && usedDecades.length < decades.length) {
                    const decadeIndex = Math.floor(Math.random() * decades.length);
                    if (!usedDecades.includes(decadeIndex)) {
                        const [min, max] = decades[decadeIndex];
                        const num = Math.floor(Math.random() * (max - min + 1)) + min;
                        if (!numbers.includes(num)) {
                            numbers.push(num);
                            usedDecades.push(decadeIndex);
                        }
                    }
                }
                
                // Fill remaining with random numbers if needed
                while (numbers.length < 5) {
                    const num = Math.floor(Math.random() * 69) + 1;
                    if (!numbers.includes(num)) {
                        numbers.push(num);
                    }
                }
                
                return numbers.sort((a, b) => a - b);
            }
        ];
        
        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        return selectedPattern();
    }

    generateStatisticalNumbers() {
        // Use normal distribution centered around the middle of the range
        const numbers = [];
        const mean = 35;
        const stdDev = 15;
        
        while (numbers.length < 5) {
            // Box-Muller transformation for normal distribution
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            
            const num = Math.round(mean + stdDev * z0);
            
            if (num >= 1 && num <= 69 && !numbers.includes(num)) {
                numbers.push(num);
            }
        }
        
        return numbers.sort((a, b) => a - b);
    }

    generateStatisticalPowerball() {
        // Use weighted distribution for powerball
        const weights = Array.from({length: 26}, (_, i) => {
            // Slightly favor middle numbers
            const distance = Math.abs(i + 1 - 13.5);
            return Math.max(0.5, 2 - distance / 13);
        });
        
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        const random = Math.random() * totalWeight;
        
        let cumulativeWeight = 0;
        for (let i = 0; i < weights.length; i++) {
            cumulativeWeight += weights[i];
            if (random <= cumulativeWeight) {
                return i + 1;
            }
        }
        
        return Math.floor(Math.random() * 26) + 1;
    }

    combineAlgorithmResults(algorithmResults) {
        const numberScores = {};
        
        // Initialize scores
        for (let i = 1; i <= 69; i++) {
            numberScores[i] = 0;
        }
        
        // Add weighted scores from each algorithm
        algorithmResults.forEach(result => {
            result.numbers.forEach(num => {
                numberScores[num] += result.weight;
            });
        });
        
        // Select top 5 numbers
        const sortedNumbers = Object.entries(numberScores)
            .sort(([,a], [,b]) => b - a)
            .map(([num]) => parseInt(num));
        
        return sortedNumbers.slice(0, 5);
    }

    combinePowerballResults(powerballResults) {
        const powerballScores = {};
        
        // Initialize scores
        for (let i = 1; i <= 26; i++) {
            powerballScores[i] = 0;
        }
        
        // Add weighted scores
        powerballResults.forEach(result => {
            powerballScores[result.powerball] += result.weight;
        });
        
        // Select highest scoring powerball
        const sortedPowerballs = Object.entries(powerballScores)
            .sort(([,a], [,b]) => b - a)
            .map(([num]) => parseInt(num));
        
        return sortedPowerballs[0];
    }

    calculateConfidence(historicalStats, numbers, powerball) {
        if (!historicalStats) return 0.5;
        
        let confidence = 0.5; // Base confidence
        
        // Factor in frequency data
        if (historicalStats.numberFrequency) {
            const avgFrequency = historicalStats.totalDrawings / 69;
            const numberConfidence = numbers.reduce((sum, num) => {
                const frequency = historicalStats.numberFrequency[num] || 0;
                return sum + Math.min(1, frequency / avgFrequency);
            }, 0) / 5;
            
            confidence += (numberConfidence - 0.5) * 0.2;
        }
        
        // Factor in powerball frequency
        if (historicalStats.powerballFrequency) {
            const avgPowerballFreq = historicalStats.totalDrawings / 26;
            const powerballFreq = historicalStats.powerballFrequency[powerball] || 0;
            const powerballConfidence = Math.min(1, powerballFreq / avgPowerballFreq);
            
            confidence += (powerballConfidence - 0.5) * 0.1;
        }
        
        return Math.max(0.1, Math.min(0.9, confidence));
    }

    calculateHybridConfidence(historicalStats, numbers, powerball) {
        const baseConfidence = this.calculateConfidence(historicalStats, numbers, powerball);
        
        // Hybrid gets a slight boost for combining multiple approaches
        return Math.min(0.95, baseConfidence + 0.1);
    }

    // Advanced quick selection for UI
    generateAdvancedQuickSelection(historicalStats) {
        const algorithms = ['frequency', 'hot_cold', 'pattern', 'statistical', 'hybrid'];
        const results = [];
        
        algorithms.forEach(algorithm => {
            const sets = this.algorithms[algorithm](historicalStats, 1);
            if (sets.length > 0) {
                results.push(sets[0]);
            }
        });
        
        return results;
    }
};