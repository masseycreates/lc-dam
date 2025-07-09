// Application configuration and constants
export const API_CONFIG = {
    BASE_URL: '/api',
    ENDPOINTS: {
        POWERBALL: '/powerball',
        POWERBALL_HISTORY: '/powerball-history',
        CLAUDE: '/claude',
        DIAGNOSE: '/diagnose',
        TEST: '/test'
    },
    TIMEOUTS: {
        DEFAULT: 30000,
        CLAUDE: 60000,
        HISTORY: 45000
    },
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};

export const LOTTERY_CONFIG = {
    NUMBERS: {
        MAIN_MIN: 1,
        MAIN_MAX: 69,
        MAIN_COUNT: 5,
        POWERBALL_MIN: 1,
        POWERBALL_MAX: 26
    },
    ODDS: {
        JACKPOT: 292201338,
        MATCH_5: 11688053,
        MATCH_4_POWERBALL: 913129,
        MATCH_4: 36525,
        MATCH_3_POWERBALL: 14494,
        MATCH_3: 579,
        MATCH_2_POWERBALL: 701,
        MATCH_1_POWERBALL: 92,
        POWERBALL_ONLY: 38
    },
    PRIZES: {
        JACKPOT: 'Jackpot',
        MATCH_5: 1000000,
        MATCH_4_POWERBALL: 50000,
        MATCH_4: 100,
        MATCH_3_POWERBALL: 100,
        MATCH_3: 7,
        MATCH_2_POWERBALL: 7,
        MATCH_1_POWERBALL: 4,
        POWERBALL_ONLY: 4
    },
    DRAWING_DAYS: ['Monday', 'Wednesday', 'Saturday'],
    DRAWING_TIME: '10:59 PM ET'
};

export const AI_CONFIG = {
    CLAUDE: {
        MODEL: 'claude-3-opus-20240229',
        MAX_TOKENS: 4000,
        TEMPERATURE: 0.7,
        SYSTEM_PROMPT: `You are an advanced lottery analysis AI assistant specializing in Powerball number prediction and analysis. 
        You have access to historical lottery data and should provide intelligent, data-driven insights while being clear about the random nature of lottery drawings.
        Always maintain a responsible gambling perspective and remind users that lottery games are games of chance.`
    },
    ANALYSIS_TYPES: {
        HYBRID_PREDICTION: 'hybrid_prediction',
        PERFORMANCE_ANALYSIS: 'performance_analysis',
        VALIDATION: 'validation',
        HISTORICAL_ANALYSIS: 'historical_analysis'
    },
    STRATEGIES: {
        HYBRID: 'hybrid',
        FREQUENCY: 'frequency',
        PATTERN: 'pattern',
        STATISTICAL: 'statistical',
        RANDOM: 'random'
    }
};

export const UI_CONFIG = {
    TABS: {
        QUICK_SELECTION: 'quick-selection',
        CALCULATOR: 'calculator',
        TAX_CALCULATOR: 'tax-calculator',
        ANALYSIS: 'analysis'
    },
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark',
        AUTO: 'auto'
    },
    ANIMATIONS: {
        DURATION: 300,
        EASING: 'ease-in-out'
    },
    BREAKPOINTS: {
        SM: 640,
        MD: 768,
        LG: 1024,
        XL: 1280
    }
};

export const STORAGE_KEYS = {
    API_KEY: 'lottery_claude_api_key',
    USER_PREFERENCES: 'lottery_user_preferences',
    HISTORICAL_DATA: 'lottery_historical_data',
    PERFORMANCE_METRICS: 'lottery_performance_metrics',
    LAST_PREDICTIONS: 'lottery_last_predictions',
    THEME: 'lottery_theme'
};

export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error: Please check your internet connection',
    API_KEY_INVALID: 'Invalid API key: Please check your Claude API key',
    API_KEY_MISSING: 'API key required: Please enter your Claude API key',
    RATE_LIMIT: 'Rate limit exceeded: Please wait before making another request',
    SERVER_ERROR: 'Server error: Please try again later',
    INVALID_NUMBERS: 'Invalid numbers: Please select 5 unique numbers between 1 and 69',
    INVALID_POWERBALL: 'Invalid Powerball: Please select a number between 1 and 26',
    DATA_UNAVAILABLE: 'Data temporarily unavailable: Using cached or mock data',
    CALCULATION_ERROR: 'Calculation error: Please check your inputs and try again'
};

export const SUCCESS_MESSAGES = {
    DATA_LOADED: 'Data loaded successfully',
    PREDICTION_GENERATED: 'Predictions generated successfully',
    CALCULATION_COMPLETE: 'Calculation completed successfully',
    API_KEY_VALIDATED: 'API key validated successfully',
    SETTINGS_SAVED: 'Settings saved successfully'
};

export const ALGORITHM_CONFIG = {
    FREQUENCY: {
        NAME: 'Frequency Analysis',
        DESCRIPTION: 'Analyzes historical frequency of numbers',
        CONFIDENCE_BASE: 0.7,
        ICON: '📊'
    },
    HOT_COLD: {
        NAME: 'Hot & Cold Numbers',
        DESCRIPTION: 'Identifies trending and overdue numbers',
        CONFIDENCE_BASE: 0.6,
        ICON: '🔥'
    },
    PATTERN: {
        NAME: 'Pattern Analysis',
        DESCRIPTION: 'Detects patterns in number sequences',
        CONFIDENCE_BASE: 0.5,
        ICON: '🔍'
    },
    STATISTICAL: {
        NAME: 'Statistical Model',
        DESCRIPTION: 'Uses statistical distributions',
        CONFIDENCE_BASE: 0.4,
        ICON: '📈'
    },
    RANDOM: {
        NAME: 'Random Generation',
        DESCRIPTION: 'Pure random number selection',
        CONFIDENCE_BASE: 0.2,
        ICON: '🎲'
    },
    HYBRID: {
        NAME: 'Hybrid AI + Algorithms',
        DESCRIPTION: 'Combines AI analysis with multiple algorithms',
        CONFIDENCE_BASE: 0.8,
        ICON: '🤖'
    }
};

export const TAX_CONFIG = {
    FEDERAL: {
        WITHHOLDING_RATE: 0.24,
        BRACKETS: [
            { min: 0, max: 22275, rate: 0.10 },
            { min: 22276, max: 89450, rate: 0.12 },
            { min: 89451, max: 190750, rate: 0.22 },
            { min: 190751, max: 364200, rate: 0.24 },
            { min: 364201, max: 462500, rate: 0.32 },
            { min: 462501, max: 693750, rate: 0.35 },
            { min: 693751, max: Infinity, rate: 0.37 }
        ]
    },
    STATE_RATES: {
        'AL': 0.05, 'AK': 0.00, 'AZ': 0.045, 'AR': 0.055, 'CA': 0.133,
        'CO': 0.0463, 'CT': 0.0699, 'DE': 0.066, 'FL': 0.00, 'GA': 0.0575,
        'HI': 0.11, 'ID': 0.058, 'IL': 0.0495, 'IN': 0.0323, 'IA': 0.0853,
        'KS': 0.057, 'KY': 0.05, 'LA': 0.0425, 'ME': 0.0715, 'MD': 0.0575,
        'MA': 0.05, 'MI': 0.0425, 'MN': 0.0985, 'MS': 0.05, 'MO': 0.054,
        'MT': 0.0675, 'NE': 0.0684, 'NV': 0.00, 'NH': 0.00, 'NJ': 0.1075,
        'NM': 0.059, 'NY': 0.1082, 'NC': 0.0475, 'ND': 0.029, 'OH': 0.0399,
        'OK': 0.05, 'OR': 0.099, 'PA': 0.0307, 'RI': 0.0599, 'SC': 0.07,
        'SD': 0.00, 'TN': 0.00, 'TX': 0.00, 'UT': 0.0495, 'VT': 0.0875,
        'VA': 0.0575, 'WA': 0.00, 'WV': 0.065, 'WI': 0.0765, 'WY': 0.00
    },
    STATE_NAMES: {
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
        'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
        'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
        'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
        'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
        'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
        'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
        'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
        'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
        'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
        'WI': 'Wisconsin', 'WY': 'Wyoming'
    },
    ANNUITY_YEARS: 30,
    LUMP_SUM_PERCENTAGE: 0.6
};

export const PERFORMANCE_CONFIG = {
    METRICS: {
        API_RESPONSE_TIME: 'api_response_time',
        ALGORITHM_EXECUTION_TIME: 'algorithm_execution_time',
        DATA_PROCESSING_TIME: 'data_processing_time',
        UI_RENDER_TIME: 'ui_render_time'
    },
    THRESHOLDS: {
        FAST: 1000,
        MODERATE: 3000,
        SLOW: 5000
    }
};

// Environment-specific configuration
export const getEnvironmentConfig = () => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
        isDevelopment,
        isProduction,
        apiUrl: isDevelopment ? 'http://localhost:3000/api' : '/api',
        enableLogging: isDevelopment,
        enableDebugMode: isDevelopment,
        cacheEnabled: isProduction,
        compressionEnabled: isProduction
    };
};

export default {
    API_CONFIG,
    LOTTERY_CONFIG,
    AI_CONFIG,
    UI_CONFIG,
    STORAGE_KEYS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    ALGORITHM_CONFIG,
    TAX_CONFIG,
    PERFORMANCE_CONFIG,
    getEnvironmentConfig
};