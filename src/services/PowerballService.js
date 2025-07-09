// API Service for Powerball data fetching
class PowerballService {
    constructor() {
        this.baseUrl = '/api';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async fetchLatestPowerballData() {
        const cacheKey = 'latest-powerball';
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const response = await fetch(`${this.baseUrl}/powerball`, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            const data = await response.json();
            
            // Cache the result
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error('Powerball API Error:', error);
            throw new Error('Unable to fetch latest Powerball data');
        }
    }

    async fetchHistoricalData(limit = 500) {
        const cacheKey = `historical-${limit}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const response = await fetch(`${this.baseUrl}/powerball-history?limit=${limit}`, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            const data = await response.json();
            
            // Cache the result
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error('Historical Data API Error:', error);
            throw new Error('Unable to fetch historical Powerball data');
        }
    }

    async runDiagnostics() {
        try {
            const response = await fetch(`${this.baseUrl}/diagnose`, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json'
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Diagnostics API Error:', error);
            throw new Error('Unable to run diagnostics');
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

export default PowerballService;