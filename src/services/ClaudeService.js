// Claude AI Service for lottery analysis
class ClaudeService {
    constructor() {
        this.baseUrl = '/api';
        this.defaultModel = 'claude-3-opus-20240229';
        this.requestTimeout = 60000; // 60 seconds
    }

    async analyzeNumbers(apiKey, analysisType, historicalData, currentJackpot, options = {}) {
        const {
            requestedSets = 5,
            strategy = 'hybrid',
            localAlgorithmResults = null,
            predictionSet = null,
            historicalContext = null
        } = options;

        if (!apiKey) {
            throw new Error('Claude API key is required');
        }

        try {
            const response = await fetch(`${this.baseUrl}/claude`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    apiKey,
                    analysisType,
                    historicalData,
                    currentJackpot,
                    requestedSets,
                    strategy,
                    localAlgorithmResults,
                    predictionSet,
                    historicalContext
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Claude API request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Claude Service Error:', error);
            throw error;
        }
    }

    async generateHybridPredictions(apiKey, historicalStats, localResults) {
        return this.analyzeNumbers(
            apiKey,
            'hybrid_prediction',
            historicalStats,
            window.currentJackpotData,
            {
                strategy: 'hybrid',
                localAlgorithmResults: localResults,
                requestedSets: 5
            }
        );
    }

    async analyzePerformance(apiKey, historicalData, predictionSet) {
        return this.analyzeNumbers(
            apiKey,
            'performance_analysis',
            historicalData,
            null,
            {
                predictionSet,
                strategy: 'analysis'
            }
        );
    }

    async validateApiKey(apiKey) {
        if (!apiKey) return false;
        
        try {
            // Simple validation request
            const response = await this.analyzeNumbers(
                apiKey,
                'validation',
                null,
                null,
                { requestedSets: 1 }
            );
            return response.success === true;
        } catch (error) {
            return false;
        }
    }

    formatAnalysisRequest(type, data) {
        const basePrompt = {
            hybrid_prediction: "Analyze historical lottery data and generate optimized number predictions using hybrid AI + algorithmic approach.",
            performance_analysis: "Evaluate the performance of previous predictions against actual lottery results.",
            validation: "Simple validation request to test API connectivity."
        };

        return {
            prompt: basePrompt[type] || basePrompt.hybrid_prediction,
            data,
            timestamp: new Date().toISOString()
        };
    }
}

export default ClaudeService;