// Advanced Lottery Intelligence System - Constants
// Global constants and configuration

window.LOTTERY_CONFIG = {
    // Powerball game configuration
    POWERBALL: {
        MIN_NUMBER: 1,
        MAX_NUMBER: 69,
        NUMBERS_COUNT: 5,
        MIN_POWERBALL: 1,
        MAX_POWERBALL: 26,
        JACKPOT_ODDS: 292201338,
        DRAWING_DAYS: ['Monday', 'Wednesday', 'Saturday'],
        DRAWING_TIME: '10:59 PM ET'
    },

    // API configuration
    API: {
        BASE_URL: '/api',
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        CACHE_TTL: {
            CURRENT_DRAWING: 300000, // 5 minutes
            HISTORICAL_DATA: 600000, // 10 minutes
            ANALYSIS: 180000 // 3 minutes
        }
    },

    // Algorithm settings
    ALGORITHMS: {
        FREQUENCY: {
            NAME: 'Frequency Analysis',
            DESCRIPTION: 'Based on historical frequency patterns',
            WEIGHT: 0.3
        },
        HOT_COLD: {
            NAME: 'Hot & Cold Numbers',
            DESCRIPTION: 'Mix of trending and overdue numbers',
            WEIGHT: 0.25
        },
        PATTERN: {
            NAME: 'Pattern Analysis',
            DESCRIPTION: 'Based on number sequence patterns',
            WEIGHT: 0.2
        },
        STATISTICAL: {
            NAME: 'Statistical Distribution',
            DESCRIPTION: 'Mathematical probability distributions',
            WEIGHT: 0.25
        },
        RANDOM: {
            NAME: 'Random Selection',
            DESCRIPTION: 'Pure random number generation',
            WEIGHT: 0.1
        },
        HYBRID: {
            NAME: 'Hybrid Approach',
            DESCRIPTION: 'Combined multi-algorithm approach',
            WEIGHT: 0.4
        }
    },

    // UI configuration
    UI: {
        MAX_GENERATED_SETS: 50,
        MAX_USER_SELECTIONS: 20,
        MAX_HISTORY_DISPLAY: 100,
        ANIMATION_DURATION: 300,
        DEBOUNCE_DELAY: 500,
        THROTTLE_DELAY: 1000
    },

    // Storage keys
    STORAGE_KEYS: {
        API_KEY: 'lottery_claude_api_key',
        USER_SELECTIONS: 'lottery_user_selections',
        GENERATED_SETS: 'lottery_generated_sets',
        HISTORICAL_DATA: 'lottery_historical_data',
        CURRENT_DRAWING: 'lottery_current_drawing',
        SETTINGS: 'lottery_settings',
        PERFORMANCE_DATA: 'lottery_performance_data'
    },

    // Error messages
    ERROR_MESSAGES: {
        INVALID_NUMBERS: 'Please select 5 unique numbers between 1 and 69',
        INVALID_POWERBALL: 'Please select a Powerball number between 1 and 26',
        INVALID_API_KEY: 'Please enter a valid Claude API key',
        API_ERROR: 'Unable to connect to the service. Please try again later.',
        NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
        TIMEOUT_ERROR: 'Request timed out. Please try again.',
        UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
        NO_HISTORICAL_DATA: 'Historical data is not available',
        GENERATION_FAILED: 'Failed to generate numbers. Please try again.',
        ANALYSIS_FAILED: 'Failed to analyze numbers. Please try again.'
    },

    // Success messages
    SUCCESS_MESSAGES: {
        NUMBERS_GENERATED: 'Numbers generated successfully',
        SELECTION_SAVED: 'Selection saved successfully',
        SELECTION_DELETED: 'Selection deleted successfully',
        DATA_REFRESHED: 'Data refreshed successfully',
        ANALYSIS_COMPLETE: 'Analysis completed successfully'
    },

    // Prize tiers and odds
    PRIZE_TIERS: [
        {
            name: 'Jackpot',
            match: '5 + Powerball',
            odds: 292201338,
            prize: 'Jackpot'
        },
        {
            name: 'Match 5',
            match: '5',
            odds: 11688054,
            prize: '$1,000,000'
        },
        {
            name: 'Match 4 + Powerball',
            match: '4 + Powerball',
            odds: 913129,
            prize: '$50,000'
        },
        {
            name: 'Match 4',
            match: '4',
            odds: 36525,
            prize: '$100'
        },
        {
            name: 'Match 3 + Powerball',
            match: '3 + Powerball',
            odds: 14494,
            prize: '$100'
        },
        {
            name: 'Match 3',
            match: '3',
            odds: 580,
            prize: '$7'
        },
        {
            name: 'Match 2 + Powerball',
            match: '2 + Powerball',
            odds: 701,
            prize: '$7'
        },
        {
            name: 'Match 1 + Powerball',
            match: '1 + Powerball',
            odds: 92,
            prize: '$4'
        },
        {
            name: 'Match Powerball',
            match: 'Powerball',
            odds: 38,
            prize: '$4'
        }
    ],

    // Statistical thresholds
    STATISTICS: {
        HOT_THRESHOLD: 0.8, // Numbers appearing more than 80% of average frequency
        COLD_THRESHOLD: 0.5, // Numbers appearing less than 50% of average frequency
        OVERDUE_THRESHOLD: 10, // Numbers not drawn in last 10 drawings
        FREQUENCY_PERCENTILE_HIGH: 75,
        FREQUENCY_PERCENTILE_LOW: 25,
        CONFIDENCE_THRESHOLD: 0.6
    },

    // Performance tracking
    PERFORMANCE: {
        TRACK_ENABLED: true,
        MAX_ENTRIES: 1000,
        METRICS: [
            'api_response_time',
            'number_generation_time',
            'analysis_time',
            'ui_render_time'
        ]
    },

    // Feature flags
    FEATURES: {
        CLAUDE_INTEGRATION: true,
        ADVANCED_ANALYTICS: true,
        PERFORMANCE_TRACKING: true,
        CACHING: true,
        OFFLINE_MODE: false,
        EXPORT_DATA: true,
        IMPORT_DATA: true
    },

    // Validation rules
    VALIDATION: {
        API_KEY_MIN_LENGTH: 10,
        API_KEY_MAX_LENGTH: 200,
        SELECTION_NAME_MAX_LENGTH: 50,
        MAX_CONCURRENT_REQUESTS: 5
    },

    // Color schemes for UI
    COLORS: {
        PRIMARY: '#2563eb',
        SECONDARY: '#64748b',
        SUCCESS: '#059669',
        WARNING: '#d97706',
        ERROR: '#dc2626',
        INFO: '#0891b2',
        HOT_NUMBER: '#ef4444',
        COLD_NUMBER: '#3b82f6',
        NEUTRAL_NUMBER: '#6b7280'
    },

    // Animation settings
    ANIMATIONS: {
        FADE_IN: 'fadeIn 0.3s ease-in',
        FADE_OUT: 'fadeOut 0.3s ease-out',
        SLIDE_IN: 'slideIn 0.3s ease-in-out',
        BOUNCE: 'bounce 0.5s ease-in-out',
        PULSE: 'pulse 1s infinite'
    }
};

// Utility constants
window.LOTTERY_UTILS = {
    // Number formatting
    formatters: {
        currency: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }),
        number: new Intl.NumberFormat('en-US'),
        percentage: new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }),
        date: new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }),
        time: new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    },

    // Regular expressions
    regex: {
        apiKey: /^[a-zA-Z0-9\-_]{10,200}$/,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        numbers: /^\d+$/,
        whitespace: /\s+/g
    },

    // Common arrays
    arrays: {
        months: [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ],
        weekdays: [
            'Sunday', 'Monday', 'Tuesday', 'Wednesday', 
            'Thursday', 'Friday', 'Saturday'
        ],
        algorithms: [
            'frequency', 'hot_cold', 'pattern', 'statistical', 'random', 'hybrid'
        ]
    }
};

// Export for backward compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LOTTERY_CONFIG, LOTTERY_UTILS };
}