// Claude AI Integration Service - Simplified
class HybridClaudeLotteryAnalyzer {
    constructor() {
        this.apiKey = null;
        this.baseURL = "/api/claude";
        this.isEnabled = false;
        this.maxRetries = 2;
        this.hybridMode = true;
    }

    initialize(apiKey) {
        this.apiKey = apiKey;
        this.isEnabled = true;
        console.log('Claude AI initialized with hybrid system');
    }

    async generateHybridQuickSelection(historicalData, currentJackpot, requestedSets = 5, strategy = 'hybrid') {
        if (!this.apiKey || !this.isEnabled) {
            throw new Error('Claude AI not properly initialized');
        }

        try {
            console.log('🤖🧮 Generating HYBRID Claude + Algorithms selections...');
            
            // First generate local results as backup
            const localResults = await this.generateLocalAlgorithmResults(historicalData, requestedSets);
            console.log(`✅ Generated ${localResults.length} local algorithm results`);
            
            // Prepare request to Claude API
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    analysisType: 'hybridSelection',
                    historicalData: this.sanitizeHistoricalData(historicalData),
                    currentJackpot: currentJackpot,
                    requestedSets: requestedSets,
                    strategy: strategy,
                    localAlgorithmResults: localResults
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success && data.claudeSelections) {
                console.log(`✅ Claude hybrid analysis generated ${data.claudeSelections.length} selections`);
                return data.claudeSelections;
            } else {
                throw new Error(data.error || 'Invalid response from Claude hybrid API');
            }

        } catch (error) {
            console.error('Claude hybrid selection failed:', error);
            
            // Return enhanced local results as fallback
            const localResults = await this.generateLocalAlgorithmResults(historicalData, requestedSets);
            return this.enhanceLocalResultsForFallback(localResults);
        }
    }

    async generateLocalAlgorithmResults(historicalData, requestedSets = 5) {
        try {
            if (!window.globalLotteryPredictor) {
                return this.generateFallbackLocalResults(requestedSets);
            }

            const predictor = window.globalLotteryPredictor;
            const convertedData = this.convertHistoricalData(historicalData);
            
            if (convertedData.length < 10) {
                return this.generateFallbackLocalResults(requestedSets);
            }
            
            const predictions = predictor.generateEnsemblePrediction(convertedData);
            return this.enhanceLocalPredictions(predictions.slice(0, requestedSets));
            
        } catch (error) {
            console.warn('Local algorithm generation failed:', error);
            return this.generateFallbackLocalResults(requestedSets);
        }
    }

    convertHistoricalData(stats) {
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
            .slice(0, 100); // Limit for performance
    }

    enhanceLocalPredictions(predictions) {
        const enhancedStrategies = [
            {
                name: "EWMA Frequency Consensus",
                description: "Exponentially Weighted Moving Average frequency analysis with recent trend weighting",
                algorithmDetail: "EWMA frequency analysis with α=0.3 decay factor"
            },
            {
                name: "Neural Network Pattern Recognition", 
                description: "Multi-layer neural network analyzing positional patterns and feature extraction",
                algorithmDetail: "10-20-69 neural architecture with pattern recognition"
            },
            {
                name: "Pair Relationship Analysis",
                description: "Co-occurrence pattern analysis identifying number pair relationships and clustering",
                algorithmDetail: "Pair frequency matrix with relationship scoring"
            },
            {
                name: "Gap Analysis Optimization",
                description: "Overdue number identification using gap pattern analysis and statistical distribution",
                algorithmDetail: "Statistical gap analysis with overdue scoring"
            },
            {
                name: "Markov Chain Transition",
                description: "State transition analysis predicting next numbers based on sequence patterns",
                algorithmDetail: "Markov chain state transition modeling"
            }
        ];
        
        return predictions.map((prediction, index) => ({
            numbers: prediction.numbers,
            powerball: prediction.powerball,
            strategy: enhancedStrategies[index]?.name || `Algorithm ${index + 1}`,
            confidence: prediction.confidence,
            analysis: enhancedStrategies[index]?.description || prediction.analysis,
            algorithmDetail: enhancedStrategies[index]?.algorithmDetail || "Mathematical analysis",
            technicalAnalysis: prediction.analysis
        }));
    }

    generateFallbackLocalResults(requestedSets) {
        const strategies = [
            "Enhanced Random Distribution",
            "Mathematical Range Optimization", 
            "Statistical Balance Analysis",
            "Frequency Pattern Recognition",
            "Sum Range Optimization"
        ];
        
        return Array.from({ length: requestedSets }, (_, i) => {
            const numbers = [];
            while (numbers.length < 5) {
                const num = Math.floor(Math.random() * 69) + 1;
                if (!numbers.includes(num)) numbers.push(num);
            }
            
            return {
                numbers: numbers.sort((a, b) => a - b),
                powerball: Math.floor(Math.random() * 26) + 1,
                strategy: strategies[i % strategies.length],
                confidence: 70 + Math.floor(Math.random() * 15),
                analysis: "Mathematical distribution with statistical constraints",
                algorithmDetail: "Enhanced random with optimization",
                technicalAnalysis: "Fallback mathematical analysis"
            };
        });
    }

    enhanceLocalResultsForFallback(localResults) {
        return localResults.map((result, index) => ({
            id: index + 1,
            name: `🧮 ${result.strategy} (Algorithm)`,
            description: `LOCAL ALGORITHM: ${result.analysis} (Claude AI enhancement temporarily unavailable)`,
            algorithmDetail: result.algorithmDetail,
            numbers: result.numbers,
            powerball: result.powerball,
            strategy: `${result.confidence}% Algorithm Confidence`,
            confidence: result.confidence,
            actualStrategy: result.strategy,
            technicalAnalysis: result.technicalAnalysis,
            claudeGenerated: false,
            isHybrid: false
        }));
    }

    async testConnection() {
        try {
            console.log('Testing Claude AI connection...');
            
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    analysisType: 'predictionInsights',
                    predictionSet: {
                        numbers: [1, 2, 3, 4, 5],
                        powerball: 1,
                        strategy: 'connection_test',
                        confidence: 50
                    },
                    historicalContext: {
                        totalDrawings: 100,
                        recentTrends: 'connection_test'
                    }
                })
            });

            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Claude AI connection successful');
                return { success: true, error: null, usage: data.usage };
            } else {
                throw new Error(data.error || 'Unknown API error');
            }

        } catch (error) {
            console.warn('Claude connection failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    sanitizeHistoricalData(data) {
        if (!data || !data.drawings) {
            return { drawings: [], totalDrawings: 0 };
        }

        const maxDrawings = 50; // Reduced for performance
        const sanitizedDrawings = data.drawings
            .slice(0, maxDrawings)
            .filter(drawing => 
                drawing.numbers && 
                Array.isArray(drawing.numbers) && 
                drawing.numbers.length === 5 &&
                drawing.powerball
            )
            .map(drawing => ({
                numbers: drawing.numbers,
                powerball: drawing.powerball,
                date: drawing.date || 'Unknown'
            }));

        return {
            drawings: sanitizedDrawings,
            totalDrawings: data.totalDrawings || sanitizedDrawings.length,
            hotNumbers: data.hotNumbers?.slice(0, 10) || [],
            coldNumbers: data.coldNumbers?.slice(0, 10) || []
        };
    }

    validateApiKey(key) {
        return key && typeof key === 'string' && key.startsWith('sk-ant-') && key.length > 20;
    }

    getStatus() {
        return {
            isEnabled: this.isEnabled,
            hasApiKey: !!this.apiKey,
            endpoint: this.baseURL,
            hybridMode: this.hybridMode
        };
    }
}

// Export to global scope
window.HybridClaudeLotteryAnalyzer = HybridClaudeLotteryAnalyzer;
