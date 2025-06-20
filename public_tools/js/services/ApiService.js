// API Service for Lottery Data
class ApiService {
    constructor() {
        this.baseURL = '';
        this.timeout = 30000;
    }

    async fetchLatestPowerballData() {
        try {
            const response = await fetch('/api/powerball', {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Error fetching latest data:', error);
            throw error;
        }
    }

    async fetchHistoricalData(limit = 500) {
        try {
            const response = await fetch(`/api/powerball-history?limit=${limit}`, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Error fetching historical data:', error);
            throw error;
        }
    }

    async testApiConnection() {
        try {
            const response = await fetch('/api/test', {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Connection test failed:', error);
            throw error;
        }
    }

    async runDiagnostics() {
        try {
            const response = await fetch('/api/diagnose', {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Diagnostics failed:', error);
            throw error;
        }
    }

    // Helper method to format API errors
    formatError(error) {
        if (error.response && error.response.data) {
            return error.response.data.message || error.response.data.error || 'API Error';
        }
        return error.message || 'Unknown error occurred';
    }

    // Helper method to check if API is available
    async isApiAvailable() {
        try {
            await this.testApiConnection();
            return true;
        } catch (error) {
            console.warn('API not available:', error.message);
            return false;
        }
    }
}

// Export to global scope
window.ApiService = ApiService;