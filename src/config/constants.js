// Advanced Lottery Intelligence System - Configuration Constants
// Global constants available throughout the application

window.LOTTERY_CONFIG = {
    API: {
        BASE_URL: '/api',
        ENDPOINTS: {
            POWERBALL: '/api/powerball',
            POWERBALL_HISTORY: '/api/powerball-history',
            CLAUDE: '/api/claude',
            DIAGNOSE: '/api/diagnose',
            TEST: '/api/test'
        },
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },

    LOTTERY: {
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
        JACKPOT_ODDS: 292201338
    },

    AI: {
        CLAUDE: {
            MODEL: 'claude-3-opus-20240229',
            MAX_TOKENS: 4000,
            TEMPERATURE: 0.7,
            CONFIDENCE_THRESHOLD: 0.6
        },
        FALLBACK_ENABLED: true,
        TIMEOUT: 25000
    },

    UI_CONFIG: {
        TABS: {
            QUICK_SELECTION: 'quick-selection',
            CALCULATOR: 'calculator',
            TAX_CALCULATOR: 'tax-calculator',
            ANALYSIS: 'analysis'
        },
        REFRESH_INTERVAL: 300000, // 5 minutes
        ANIMATION_DURATION: 300
    },

    STORAGE_KEYS: {
        API_KEY: 'lottery_claude_api_key',
        USER_PREFERENCES: 'lottery_user_preferences',
        HISTORICAL_DATA: 'lottery_historical_data',
        PERFORMANCE_METRICS: 'lottery_performance_metrics'
    },

    ERROR_MESSAGES: {
        NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
        API_ERROR: 'API service temporarily unavailable. Please try again later.',
        INVALID_API_KEY: 'Invalid Claude API key. Please check your key and try again.',
        DATA_UNAVAILABLE: 'Lottery data is currently unavailable. System running in offline mode.',
        GENERATION_FAILED: 'Number generation failed. Please try again.',
        CALCULATION_ERROR: 'Tax calculation error. Please verify your inputs.'
    },

    SUCCESS_MESSAGES: {
        DATA_LOADED: 'Live lottery data loaded successfully',
        AI_CONNECTED: 'Claude Opus 4 AI connected and ready',
        NUMBERS_GENERATED: 'Lucky numbers generated successfully',
        CALCULATION_COMPLETE: 'Tax calculation completed'
    },

    ALGORITHM_CONFIG: {
        FREQUENCY: {
            NAME: 'Frequency Analysis',
            DESCRIPTION: 'Based on historical frequency patterns',
            ICON: '📊',
            WEIGHT: 0.2
        },
        HOT_COLD: {
            NAME: 'Hot & Cold Analysis',
            DESCRIPTION: 'Trending and overdue numbers',
            ICON: '🔥',
            WEIGHT: 0.15
        },
        PATTERN: {
            NAME: 'Pattern Analysis',
            DESCRIPTION: 'Sequence and gap analysis',
            ICON: '🔍',
            WEIGHT: 0.15
        },
        STATISTICAL: {
            NAME: 'Statistical Analysis',
            DESCRIPTION: 'Mathematical probability distributions',
            ICON: '📈',
            WEIGHT: 0.2
        },
        RANDOM: {
            NAME: 'Random Selection',
            DESCRIPTION: 'Pure random number generation',
            ICON: '🎲',
            WEIGHT: 0.1
        },
        HYBRID: {
            NAME: 'Hybrid Analysis',
            DESCRIPTION: 'Combined algorithm approach',
            ICON: '🧮',
            WEIGHT: 0.2
        }
    },

    TAX_CONFIG: {
        FEDERAL: {
            BRACKETS_2024: [
                { min: 0, max: 11000, rate: 0.10 },
                { min: 11000, max: 44725, rate: 0.12 },
                { min: 44725, max: 95375, rate: 0.22 },
                { min: 95375, max: 182050, rate: 0.24 },
                { min: 182050, max: 231250, rate: 0.32 },
                { min: 231250, max: 578125, rate: 0.35 },
                { min: 578125, max: Infinity, rate: 0.37 }
            ],
            STANDARD_DEDUCTION: 13850
        },
        FICA: {
            SOCIAL_SECURITY_RATE: 0.062,
            MEDICARE_RATE: 0.0145,
            SOCIAL_SECURITY_WAGE_BASE: 160200,
            ADDITIONAL_MEDICARE_THRESHOLD: 200000,
            ADDITIONAL_MEDICARE_RATE: 0.009
        },
        STATE_RATES: {
            'AL': 0.05, 'AK': 0.00, 'AZ': 0.045, 'AR': 0.063, 'CA': 0.133,
            'CO': 0.0455, 'CT': 0.0699, 'DE': 0.066, 'FL': 0.00, 'GA': 0.0575,
            'HI': 0.11, 'ID': 0.058, 'IL': 0.0495, 'IN': 0.0323, 'IA': 0.0853,
            'KS': 0.057, 'KY': 0.05, 'LA': 0.0425, 'ME': 0.0715, 'MD': 0.0575,
            'MA': 0.05, 'MI': 0.0425, 'MN': 0.0985, 'MS': 0.05, 'MO': 0.054,
            'MT': 0.0675, 'NE': 0.0684, 'NV': 0.00, 'NH': 0.00, 'NJ': 0.1075,
            'NM': 0.059, 'NY': 0.1090, 'NC': 0.0525, 'ND': 0.0295, 'OH': 0.0399,
            'OK': 0.05, 'OR': 0.099, 'PA': 0.0307, 'RI': 0.0599, 'SC': 0.07,
            'SD': 0.00, 'TN': 0.00, 'TX': 0.00, 'UT': 0.0495, 'VT': 0.0875,
            'VA': 0.0575, 'WA': 0.00, 'WV': 0.065, 'WI': 0.0765, 'WY': 0.00,
            'DC': 0.0975
        }
    },

    PERFORMANCE_CONFIG: {
        MONITORING_ENABLED: true,
        METRICS_RETENTION_DAYS: 7,
        PERFORMANCE_BUDGET: {
            INITIAL_LOAD: 3000,
            API_RESPONSE: 5000,
            ALGORITHM_EXECUTION: 1000
        },
        MEMORY_THRESHOLD: 100 // MB
    }
};

// Make constants available globally
window.API_CONFIG = window.LOTTERY_CONFIG.API;
window.LOTTERY_RULES = window.LOTTERY_CONFIG.LOTTERY;
window.AI_CONFIG = window.LOTTERY_CONFIG.AI;
window.UI_CONFIG = window.LOTTERY_CONFIG.UI_CONFIG;
window.ALGORITHM_CONFIG = window.LOTTERY_CONFIG.ALGORITHM_CONFIG;
window.TAX_CONFIG = window.LOTTERY_CONFIG.TAX_CONFIG;