// Advanced Lottery Intelligence System - API Service
// Global API service for handling all external API calls

window.ApiService = class {
    constructor() {
        this.baseUrl = '/api';
        this.defaultTimeout = 30000;
    }

    // Generic API call method
    async makeApiCall(endpoint, options = {}) {
        const startTime = performance.now();
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            window.trackPerformance(`api_${endpoint.replace('/', '_')}`, startTime);
            
            return data;
        } catch (error) {
            window.trackPerformance(`api_${endpoint.replace('/', '_')}_error`, startTime);
            throw error;
        }
    }

    // Powerball data methods
    async getCurrentPowerball() {
        try {
            const data = await this.makeApiCall('/powerball');
            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('Failed to fetch current Powerball data:', error);
            return {
                success: false,
                error: window.handleApiError(error, 'Powerball API')
            };
        }
    }

    async getPowerballHistory(limit = 100) {
        try {
            const data = await this.makeApiCall(`/powerball-history?limit=${limit}`);
            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('Failed to fetch Powerball history:', error);
            return {
                success: false,
                error: window.handleApiError(error, 'Powerball History API')
            };
        }
    }

    // Claude AI integration
    async getClaudeAnalysis(prompt, apiKey, options = {}) {
        if (!apiKey) {
            return {
                success: false,
                error: window.LOTTERY_CONFIG.ERROR_MESSAGES.INVALID_API_KEY
            };
        }

        const validation = window.validateApiKey(apiKey);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }

        try {
            const requestBody = {
                prompt,
                apiKey,
                maxTokens: options.maxTokens || 1000,
                temperature: options.temperature || 0.7
            };

            const data = await this.makeApiCall('/claude', {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });

            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('Failed to get Claude analysis:', error);
            return {
                success: false,
                error: window.handleApiError(error, 'Claude AI')
            };
        }
    }

    // Diagnostic methods
    async runDiagnostics() {
        try {
            const data = await this.makeApiCall('/diagnose');
            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('Failed to run diagnostics:', error);
            return {
                success: false,
                error: window.handleApiError(error, 'Diagnostics')
            };
        }
    }

    // Test API connectivity
    async testConnection() {
        try {
            const data = await this.makeApiCall('/test');
            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('API connection test failed:', error);
            return {
                success: false,
                error: window.handleApiError(error, 'Connection Test')
            };
        }
    }

    // Batch operations
    async batchRequest(requests) {
        const results = [];
        const batchSize = 5; // Limit concurrent requests
        
        for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);
            const batchPromises = batch.map(async (request) => {
                try {
                    const result = await this.makeApiCall(request.endpoint, request.options);
                    return { success: true, data: result, id: request.id };
                } catch (error) {
                    return { 
                        success: false, 
                        error: window.handleApiError(error, 'Batch Request'),
                        id: request.id 
                    };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        
        return results;
    }

    // Cache management
    getCachedData(key) {
        return window.loadFromStorage(`api_cache_${key}`);
    }

    setCachedData(key, data, ttl = 300000) { // 5 minutes default TTL
        const cacheItem = {
            data,
            timestamp: Date.now(),
            ttl
        };
        return window.saveToStorage(`api_cache_${key}`, cacheItem);
    }

    isCacheValid(key) {
        const cached = this.getCachedData(key);
        if (!cached) return false;
        
        return (Date.now() - cached.timestamp) < cached.ttl;
    }

    clearCache(key = null) {
        if (key) {
            return window.clearStorage(`api_cache_${key}`);
        } else {
            // Clear all API cache
            const keys = Object.keys(localStorage).filter(k => k.startsWith('api_cache_'));
            keys.forEach(key => localStorage.removeItem(key));
            return true;
        }
    }

    // Cached API methods
    async getCachedPowerball() {
        const cacheKey = 'current_powerball';
        
        if (this.isCacheValid(cacheKey)) {
            const cached = this.getCachedData(cacheKey);
            return { success: true, data: cached.data, cached: true };
        }
        
        const result = await this.getCurrentPowerball();
        if (result.success) {
            this.setCachedData(cacheKey, result.data, 300000); // 5 minutes
        }
        
        return result;
    }

    async getCachedPowerballHistory(limit = 100) {
        const cacheKey = `powerball_history_${limit}`;
        
        if (this.isCacheValid(cacheKey)) {
            const cached = this.getCachedData(cacheKey);
            return { success: true, data: cached.data, cached: true };
        }
        
        const result = await this.getPowerballHistory(limit);
        if (result.success) {
            this.setCachedData(cacheKey, result.data, 600000); // 10 minutes
        }
        
        return result;
    }
};

// Create global instance
window.apiService = new window.ApiService();