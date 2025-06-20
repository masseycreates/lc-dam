// Constants and Configuration
window.APP_CONSTANTS = {
    // Lottery Rules
    MAIN_NUMBERS: {
        MIN: 1,
        MAX: 69,
        COUNT: 5
    },
    POWERBALL: {
        MIN: 1,
        MAX: 26,
        COUNT: 1
    },
    
    // Drawing Schedule
    DRAWING_DAYS: [1, 3, 6], // Monday, Wednesday, Saturday
    DRAWING_TIME: {
        HOUR: 22,
        MINUTE: 59,
        TIMEZONE: 'America/New_York'
    },
    
    // Data Limits
    DATA_LIMITS: [
        { value: 50, label: '50 drawings (2 months)' },
        { value: 100, label: '100 drawings (4 months)' },
        { value: 250, label: '250 drawings (1 year)' },
        { value: 500, label: '500 drawings (2 years)' },
        { value: 1000, label: '1000 drawings (4 years)' },
        { value: 1500, label: '1500 drawings (6 years)' },
        { value: 2000, label: '2000 drawings (8+ years)' }
    ],
    
    // API Configuration
    API: {
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        CACHE_DURATION: 1800000 // 30 minutes
    },
    
    // Algorithm Configuration
    ALGORITHMS: {
        EWMA_ALPHA: 0.3,
        NEURAL_NETWORK: {
            INPUT_SIZE: 10,
            HIDDEN_SIZE: 20,
            OUTPUT_SIZE: 69
        },
        CONFIDENCE_THRESHOLDS: {
            HIGH: 85,
            MEDIUM: 75,
            LOW: 60
        }
    },
    
    // UI Configuration
    UI: {
        TABS: [
            { id: 'quick-selection', label: 'AI Hybrid', icon: '🤖🧮' },
            { id: 'calculator', label: 'Calculator', icon: '🎯' },
            { id: 'tax-calculator', label: 'Tax Calculator', icon: '💰' },
            { id: 'analysis', label: 'Analysis', icon: '📊' }
        ],
        SELECTION_GRID_MIN_WIDTH: 320,
        COMPACT_MODE_HEIGHT: 800
    },
    
    // Tax Configuration
    TAX: {
        FEDERAL_WITHHOLDING_RATE: 0.24,
        ANNUITY_YEARS: 30,
        LUMP_SUM_PERCENTAGE: 0.6,
        ANNUITY_INCREASE_RATE: 0.05
    },
    
    // Validation Rules
    VALIDATION: {
        MIN_HISTORICAL_DATA: 10,
        MIN_JACKPOT: 20000000,
        MAX_JACKPOT: 5000000000,
        API_KEY_MIN_LENGTH: 20
    },
    
    // Messages
    MESSAGES: {
        LOADING: '🚀 Initializing hybrid Claude + 6 algorithms system...',
        DATA_UNAVAILABLE: 'LIVE POWERBALL DATA TEMPORARILY UNAVAILABLE',
        AI_DISABLED: 'Using local algorithms only. Enable Claude for hybrid analysis.',
        CONNECTION_SUCCESS: '✅ Claude AI hybrid system enabled and connected successfully',
        CONNECTION_FAILED: '❌ Claude AI connection failed'
    }
};