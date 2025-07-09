// Lottery number generation algorithms and utilities
export class LotteryAlgorithms {
    constructor() {
        this.algorithms = {
            frequency: this.frequencyAnalysis.bind(this),
            hot_cold: this.hotColdAnalysis.bind(this),
            pattern: this.patternAnalysis.bind(this),
            statistical: this.statisticalAnalysis.bind(this),
            random: this.randomGeneration.bind(this),
            hybrid: this.hybridAnalysis.bind(this)
        };
    }

    // Generate numbers using frequency analysis
    frequencyAnalysis(historicalData, count = 5) {
        if (!historicalData || !historicalData.numberFrequency) {
            return this.randomGeneration(null, count);
        }

        const { numberFrequency, powerballs } = historicalData;
        const results = [];

        for (let i = 0; i < count; i++) {
            // Sort numbers by frequency and add some randomness
            const sortedNumbers = Object.entries(numberFrequency)
                .sort(([,a], [,b]) => b - a)
                .map(([num]) => parseInt(num));

            const numbers = [];
            const used = new Set();

            // Pick top frequent numbers with some randomness
            for (let j = 0; j < 5; j++) {
                let attempts = 0;
                let num;
                do {
                    const index = Math.floor(Math.random() * Math.min(20, sortedNumbers.length));
                    num = sortedNumbers[index];
                    attempts++;
                } while (used.has(num) && attempts < 50);
                
                if (!used.has(num)) {
                    numbers.push(num);
                    used.add(num);
                }
            }

            // Fill remaining slots if needed
            while (numbers.length < 5) {
                const num = Math.floor(Math.random() * 69) + 1;
                if (!used.has(num)) {
                    numbers.push(num);
                    used.add(num);
                }
            }

            // Select powerball based on frequency
            const sortedPowerballs = Object.entries(powerballs || {})
                .sort(([,a], [,b]) => b - a)
                .map(([num]) => parseInt(num));
            
            const powerball = sortedPowerballs.length > 0 
                ? sortedPowerballs[Math.floor(Math.random() * Math.min(10, sortedPowerballs.length))]
                : Math.floor(Math.random() * 26) + 1;

            results.push({
                numbers: numbers.sort((a, b) => a - b),
                powerball,
                algorithm: 'frequency',
                confidence: 0.7
            });
        }

        return results;
    }

    // Hot and cold number analysis
    hotColdAnalysis(historicalData, count = 5) {
        if (!historicalData || !historicalData.numberFrequency) {
            return this.randomGeneration(null, count);
        }

        const { numberFrequency, powerballs } = historicalData;
        const results = [];

        // Identify hot and cold numbers
        const frequencies = Object.entries(numberFrequency).map(([num, freq]) => ({
            number: parseInt(num),
            frequency: freq
        }));

        frequencies.sort((a, b) => b.frequency - a.frequency);
        const hotNumbers = frequencies.slice(0, 20).map(item => item.number);
        const coldNumbers = frequencies.slice(-20).map(item => item.number);

        for (let i = 0; i < count; i++) {
            const numbers = [];
            const used = new Set();

            // Mix hot and cold numbers
            const hotCount = Math.floor(Math.random() * 3) + 2; // 2-4 hot numbers
            const coldCount = 5 - hotCount;

            // Add hot numbers
            for (let j = 0; j < hotCount; j++) {
                let attempts = 0;
                let num;
                do {
                    num = hotNumbers[Math.floor(Math.random() * hotNumbers.length)];
                    attempts++;
                } while (used.has(num) && attempts < 20);
                
                if (!used.has(num)) {
                    numbers.push(num);
                    used.add(num);
                }
            }

            // Add cold numbers
            for (let j = 0; j < coldCount; j++) {
                let attempts = 0;
                let num;
                do {
                    num = coldNumbers[Math.floor(Math.random() * coldNumbers.length)];
                    attempts++;
                } while (used.has(num) && attempts < 20);
                
                if (!used.has(num)) {
                    numbers.push(num);
                    used.add(num);
                }
            }

            // Fill remaining slots
            while (numbers.length < 5) {
                const num = Math.floor(Math.random() * 69) + 1;
                if (!used.has(num)) {
                    numbers.push(num);
                    used.add(num);
                }
            }

            const powerball = Math.floor(Math.random() * 26) + 1;

            results.push({
                numbers: numbers.sort((a, b) => a - b),
                powerball,
                algorithm: 'hot_cold',
                confidence: 0.6
            });
        }

        return results;
    }

    // Pattern analysis
    patternAnalysis(historicalData, count = 5) {
        if (!historicalData || !historicalData.recentDrawings) {
            return this.randomGeneration(null, count);
        }

        const results = [];
        const recentDrawings = historicalData.recentDrawings.slice(0, 20);

        for (let i = 0; i < count; i++) {
            const numbers = [];
            const used = new Set();

            // Analyze number gaps and patterns
            const gaps = this.analyzeNumberGaps(recentDrawings);
            const patterns = this.findNumberPatterns(recentDrawings);

            // Generate numbers based on patterns
            for (let j = 0; j < 5; j++) {
                let num;
                if (Math.random() < 0.3 && patterns.length > 0) {
                    // Use pattern-based number
                    num = patterns[Math.floor(Math.random() * patterns.length)];
                } else {
                    // Use gap analysis
                    num = this.generateFromGaps(gaps);
                }

                let attempts = 0;
                while (used.has(num) && attempts < 50) {
                    num = Math.floor(Math.random() * 69) + 1;
                    attempts++;
                }

                numbers.push(num);
                used.add(num);
            }

            const powerball = Math.floor(Math.random() * 26) + 1;

            results.push({
                numbers: numbers.sort((a, b) => a - b),
                powerball,
                algorithm: 'pattern',
                confidence: 0.5
            });
        }

        return results;
    }

    // Statistical analysis
    statisticalAnalysis(historicalData, count = 5) {
        if (!historicalData) {
            return this.randomGeneration(null, count);
        }

        const results = [];

        for (let i = 0; i < count; i++) {
            const numbers = [];
            const used = new Set();

            // Use normal distribution around mean
            const mean = 35; // Middle of 1-69 range
            const stdDev = 15;

            for (let j = 0; j < 5; j++) {
                let num;
                let attempts = 0;
                do {
                    // Generate using normal distribution
                    num = Math.round(this.normalRandom(mean, stdDev));
                    num = Math.max(1, Math.min(69, num)); // Clamp to valid range
                    attempts++;
                } while (used.has(num) && attempts < 50);

                numbers.push(num);
                used.add(num);
            }

            const powerball = Math.floor(Math.random() * 26) + 1;

            results.push({
                numbers: numbers.sort((a, b) => a - b),
                powerball,
                algorithm: 'statistical',
                confidence: 0.4
            });
        }

        return results;
    }

    // Random generation
    randomGeneration(historicalData, count = 5) {
        const results = [];

        for (let i = 0; i < count; i++) {
            const numbers = [];
            const used = new Set();

            for (let j = 0; j < 5; j++) {
                let num;
                do {
                    num = Math.floor(Math.random() * 69) + 1;
                } while (used.has(num));

                numbers.push(num);
                used.add(num);
            }

            const powerball = Math.floor(Math.random() * 26) + 1;

            results.push({
                numbers: numbers.sort((a, b) => a - b),
                powerball,
                algorithm: 'random',
                confidence: 0.2
            });
        }

        return results;
    }

    // Hybrid analysis combining multiple algorithms
    hybridAnalysis(historicalData, count = 5) {
        const results = [];
        const algorithms = ['frequency', 'hot_cold', 'pattern', 'statistical'];

        for (let i = 0; i < count; i++) {
            // Randomly select algorithm for each set
            const algorithm = algorithms[Math.floor(Math.random() * algorithms.length)];
            const result = this.algorithms[algorithm](historicalData, 1)[0];
            
            // Boost confidence for hybrid approach
            result.confidence = Math.min(0.8, result.confidence + 0.1);
            result.algorithm = 'hybrid';
            
            results.push(result);
        }

        return results;
    }

    // Helper methods
    analyzeNumberGaps(drawings) {
        const gaps = {};
        for (let i = 1; i <= 69; i++) {
            gaps[i] = 0;
        }

        drawings.forEach(drawing => {
            if (drawing.numbers) {
                drawing.numbers.forEach(num => {
                    gaps[num] = (gaps[num] || 0) + 1;
                });
            }
        });

        return gaps;
    }

    findNumberPatterns(drawings) {
        const patterns = [];
        // Simple pattern detection - consecutive numbers, same endings, etc.
        // This is a simplified implementation
        return patterns;
    }

    generateFromGaps(gaps) {
        // Generate number based on gap analysis
        const numbers = Object.keys(gaps).map(Number);
        return numbers[Math.floor(Math.random() * numbers.length)];
    }

    normalRandom(mean, stdDev) {
        // Box-Muller transformation for normal distribution
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return z * stdDev + mean;
    }

    // Generate advanced quick selection
    async generateAdvancedQuickSelection(historicalStats) {
        const results = [];
        const algorithms = Object.keys(this.algorithms);

        // Generate one set from each algorithm
        algorithms.forEach(algorithm => {
            if (algorithm !== 'hybrid') {
                const sets = this.algorithms[algorithm](historicalStats, 1);
                if (sets.length > 0) {
                    results.push(sets[0]);
                }
            }
        });

        // Add hybrid sets
        const hybridSets = this.hybridAnalysis(historicalStats, 2);
        results.push(...hybridSets);

        return results;
    }
}

export default LotteryAlgorithms;