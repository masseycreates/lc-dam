// Advanced Lottery Intelligence System - API Service
// Global API service for handling all external API calls

window.ApiService = class {
    constructor() {
        this.baseUrl = '/api';
        this.defaultTimeout = 30000;
    }

    // Safe performance tracking helper
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

    // Safe error handling helper
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
            
            this.safeTrackPerformance(`api_${endpoint.replace('/', '_')}`, startTime);
            
            return data;
        } catch (error) {
            this.safeTrackPerformance(`api_${endpoint.replace('/', '_')}_error`, startTime);
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
                error: this.safeHandleApiError(error, 'Powerball API')
            };
        }
    }

    // Alias methods for backward compatibility
    async fetchPowerballData() {
        return await this.getCurrentPowerball();
    }

    async fetchHistoricalData(limit = 100) {
        return await this.getPowerballHistory(limit);
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
                error: this.safeHandleApiError(error, 'Powerball History API')
            };
        }
    }

    // Claude AI integration
    async getClaudeAnalysis(prompt, apiKey, options = {}) {
        if (!apiKey) {
            return {
                success: false,
                error: window.LOTTERY_CONFIG?.ERROR_MESSAGES?.INVALID_API_KEY || 'API key is required'
            };
        }

        // Safe validation check
        let validation = { valid: true };
        try {
            if (typeof window.validateApiKey === 'function') {
                validation = window.validateApiKey(apiKey);
            } else if (window.LotteryHelpers && typeof window.LotteryHelpers.validateApiKey === 'function') {
                validation = window.LotteryHelpers.validateApiKey(apiKey);
            }
        } catch (e) {
            console.warn('API key validation failed:', e);
        }

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
                error: this.safeHandleApiError(error, 'Claude API')
            };
        }
    }

    // Cache management methods
    async getCachedPowerball() {
        const cacheKey = 'powerball_current';
        const cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        try {
            // Try to load from storage
            let cachedData = null;
            try {
                if (typeof window.loadFromStorage === 'function') {
                    cachedData = window.loadFromStorage(cacheKey);
                } else if (window.LotteryHelpers && typeof window.LotteryHelpers.loadFromStorage === 'function') {
                    cachedData = window.LotteryHelpers.loadFromStorage(cacheKey);
                }
            } catch (e) {
                console.warn('Failed to load from storage:', e);
            }
            
            if (cachedData && cachedData.timestamp && (Date.now() - cachedData.timestamp < cacheTimeout)) {
                return {
                    success: true,
                    data: cachedData.data,
                    cached: true
                };
            }
            
            // Fetch fresh data
            const result = await this.getCurrentPowerball();
            
            if (result.success) {
                const dataToCache = {
                    data: result.data,
                    timestamp: Date.now()
                };
                
                // Try to save to storage
                try {
                    if (typeof window.saveToStorage === 'function') {
                        window.saveToStorage(cacheKey, dataToCache);
                    } else if (window.LotteryHelpers && typeof window.LotteryHelpers.saveToStorage === 'function') {
                        window.LotteryHelpers.saveToStorage(cacheKey, dataToCache);
                    }
                } catch (e) {
                    console.warn('Failed to save to storage:', e);
                }
            }
            
            return result;
        } catch (error) {
            console.error('Failed to get cached Powerball data:', error);
            return {
                success: false,
                error: this.safeHandleApiError(error, 'Cached Powerball API')
            };
        }
    }

    async getCachedPowerballHistory(limit = 100) {
        const cacheKey = `powerball_history_${limit}`;
        const cacheTimeout = 60 * 60 * 1000; // 1 hour
        
        try {
            // Try to load from storage
            let cachedData = null;
            try {
                if (typeof window.loadFromStorage === 'function') {
                    cachedData = window.loadFromStorage(cacheKey);
                } else if (window.LotteryHelpers && typeof window.LotteryHelpers.loadFromStorage === 'function') {
                    cachedData = window.LotteryHelpers.loadFromStorage(cacheKey);
                }
            } catch (e) {
                console.warn('Failed to load from storage:', e);
            }
            
            if (cachedData && cachedData.timestamp && (Date.now() - cachedData.timestamp < cacheTimeout)) {
                return {
                    success: true,
                    data: cachedData.data,
                    cached: true
                };
            }
            
            // Fetch fresh data
            const result = await this.getPowerballHistory(limit);
            
            if (result.success) {
                const dataToCache = {
                    data: result.data,
                    timestamp: Date.now()
                };
                
                // Try to save to storage
                try {
                    if (typeof window.saveToStorage === 'function') {
                        window.saveToStorage(cacheKey, dataToCache);
                    } else if (window.LotteryHelpers && typeof window.LotteryHelpers.saveToStorage === 'function') {
                        window.LotteryHelpers.saveToStorage(cacheKey, dataToCache);
                    }
                } catch (e) {
                    console.warn('Failed to save to storage:', e);
                }
            }
            
            return result;
        } catch (error) {
            console.error('Failed to get cached Powerball history:', error);
            return {
                success: false,
                error: this.safeHandleApiError(error, 'Cached Powerball History API')
            };
        }
    }

    // Clear all cached data
    clearCache() {
        try {
            const cacheKeys = [
                'powerball_current',
                'powerball_history_100',
                'powerball_history_200',
                'powerball_history_500'
            ];
            
            cacheKeys.forEach(key => {
                try {
                    if (typeof window.clearStorage === 'function') {
                        window.clearStorage(key);
                    } else if (window.LotteryHelpers && typeof window.LotteryHelpers.clearStorage === 'function') {
                        window.LotteryHelpers.clearStorage(key);
                    }
                } catch (e) {
                    console.warn(`Failed to clear cache key ${key}:`, e);
                }
            });
            
            return { success: true };
        } catch (error) {
            console.error('Failed to clear cache:', error);
            return { success: false, error: error.message };
        }
    }
};

// Create global instance
window.apiService = new window.ApiService();