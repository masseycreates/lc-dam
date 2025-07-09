import { useState, useEffect, useCallback } from 'react';
import PowerballService from '../services/PowerballService.js';
import { handleApiError, trackPerformance } from '../utils/helpers.js';

// Custom hook for managing Powerball data
export const usePowerballData = () => {
    const [currentJackpot, setCurrentJackpot] = useState(null);
    const [nextDrawDate, setNextDrawDate] = useState('');
    const [liveDataAvailable, setLiveDataAvailable] = useState(false);
    const [dataStatus, setDataStatus] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [lastUpdated, setLastUpdated] = useState('');
    const [error, setError] = useState(null);

    const powerballService = new PowerballService();

    const fetchLatestData = useCallback(async () => {
        const startTime = performance.now();
        setIsUpdating(true);
        setDataStatus('🔄 Connecting to official lottery data sources...');
        setError(null);

        try {
            const data = await powerballService.fetchLatestPowerballData();
            
            if (data.success && data.dataAvailable && data.jackpot) {
                setCurrentJackpot(data.jackpot);
                setLiveDataAvailable(true);
                window.currentJackpotData = data.jackpot;
                
                if (data.nextDrawing) {
                    setNextDrawDate(data.nextDrawing.date + ' @ ' + data.nextDrawing.time);
                }
                
                setDataStatus('✅ Live data from ' + data.source);
                setLastUpdated(new Date().toLocaleString());
            } else {
                setCurrentJackpot(null);
                setLiveDataAvailable(false);
                window.currentJackpotData = null;
                setDataStatus(data.message || 'LIVE POWERBALL DATA TEMPORARILY UNAVAILABLE');
                
                if (data.nextDrawing) {
                    setNextDrawDate(data.nextDrawing.date + ' @ ' + data.nextDrawing.time);
                }
            }
        } catch (err) {
            const errorMessage = handleApiError(err, 'Powerball Data');
            setError(errorMessage);
            setCurrentJackpot(null);
            setLiveDataAvailable(false);
            window.currentJackpotData = null;
            setDataStatus('❌ Unable to connect to lottery data sources');
        } finally {
            setIsUpdating(false);
            trackPerformance('fetchLatestPowerballData', startTime);
        }
    }, []);

    const refreshData = useCallback(() => {
        fetchLatestData();
    }, [fetchLatestData]);

    useEffect(() => {
        fetchLatestData();
        
        // Set up periodic refresh every 5 minutes
        const interval = setInterval(fetchLatestData, 5 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, [fetchLatestData]);

    return {
        currentJackpot,
        nextDrawDate,
        liveDataAvailable,
        dataStatus,
        isUpdating,
        lastUpdated,
        error,
        refreshData
    };
};

// Custom hook for managing historical data
export const useHistoricalData = (initialLimit = 500) => {
    const [historicalStats, setHistoricalStats] = useState(null);
    const [historicalDataAvailable, setHistoricalDataAvailable] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historicalRecordsLimit, setHistoricalRecordsLimit] = useState(initialLimit);
    const [error, setError] = useState(null);

    const powerballService = new PowerballService();

    const fetchHistoricalData = useCallback(async (customLimit) => {
        const limit = customLimit || historicalRecordsLimit;
        const startTime = performance.now();
        setIsLoadingHistory(true);
        setError(null);

        try {
            const data = await powerballService.fetchHistoricalData(limit);
            
            if (data.success && data.dataAvailable && data.statistics) {
                setHistoricalStats(data.statistics);
                setHistoricalDataAvailable(true);
            } else {
                setHistoricalStats(null);
                setHistoricalDataAvailable(false);
                setError(data.message || 'Historical data not available');
            }
        } catch (err) {
            const errorMessage = handleApiError(err, 'Historical Data');
            setError(errorMessage);
            setHistoricalStats(null);
            setHistoricalDataAvailable(false);
        } finally {
            setIsLoadingHistory(false);
            trackPerformance('fetchHistoricalData', startTime);
        }
    }, [historicalRecordsLimit]);

    const updateLimit = useCallback((newLimit) => {
        setHistoricalRecordsLimit(newLimit);
        fetchHistoricalData(newLimit);
    }, [fetchHistoricalData]);

    const refreshHistoricalData = useCallback(() => {
        fetchHistoricalData();
    }, [fetchHistoricalData]);

    useEffect(() => {
        fetchHistoricalData();
    }, [fetchHistoricalData]);

    return {
        historicalStats,
        historicalDataAvailable,
        isLoadingHistory,
        historicalRecordsLimit,
        error,
        updateLimit,
        refreshHistoricalData
    };
};

// Custom hook for managing application state
export const useAppState = () => {
    const [activeTab, setActiveTab] = useState('quick-selection');
    const [selectedNumbers, setSelectedNumbers] = useState([]);
    const [powerball, setPowerball] = useState('');
    const [quickSelectionSets, setQuickSelectionSets] = useState([]);
    const [systemPerformance, setSystemPerformance] = useState(null);

    const updateSelectedNumbers = useCallback((numbers) => {
        setSelectedNumbers(numbers);
    }, []);

    const updatePowerball = useCallback((pb) => {
        setPowerball(pb);
    }, []);

    const updateQuickSelectionSets = useCallback((sets) => {
        setQuickSelectionSets(sets);
    }, []);

    const switchTab = useCallback((tabId) => {
        setActiveTab(tabId);
    }, []);

    const resetSelections = useCallback(() => {
        setSelectedNumbers([]);
        setPowerball('');
    }, []);

    useEffect(() => {
        // Initialize system performance metrics
        if (window.getSystemPerformanceMetrics) {
            const performance = window.getSystemPerformanceMetrics();
            setSystemPerformance(performance);
        }
    }, []);

    return {
        activeTab,
        selectedNumbers,
        powerball,
        quickSelectionSets,
        systemPerformance,
        setActiveTab: switchTab,
        updateSelectedNumbers,
        updatePowerball,
        updateQuickSelectionSets,
        resetSelections
    };
};

// Custom hook for managing AI integration
export const useAIIntegration = () => {
    const [aiApiKey, setAiApiKey] = useState('');
    const [aiEnabled, setAiEnabled] = useState(false);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState(null);

    const validateAndSetApiKey = useCallback(async (key) => {
        if (!key) {
            setAiEnabled(false);
            setAiApiKey('');
            return false;
        }

        setIsLoadingAI(true);
        setAiError(null);

        try {
            // Basic validation - you might want to implement actual API validation
            if (key.startsWith('sk-ant-') && key.length > 20) {
                setAiApiKey(key);
                setAiEnabled(true);
                
                // Save to localStorage
                localStorage.setItem('lottery_claude_api_key', key);
                
                return true;
            } else {
                throw new Error('Invalid API key format');
            }
        } catch (error) {
            setAiError(handleApiError(error, 'AI API Key'));
            setAiEnabled(false);
            return false;
        } finally {
            setIsLoadingAI(false);
        }
    }, []);

    const disableAI = useCallback(() => {
        setAiEnabled(false);
        setAiApiKey('');
        setAiError(null);
        localStorage.removeItem('lottery_claude_api_key');
    }, []);

    useEffect(() => {
        // Load API key from localStorage on mount
        const savedKey = localStorage.getItem('lottery_claude_api_key');
        if (savedKey) {
            validateAndSetApiKey(savedKey);
        }
    }, [validateAndSetApiKey]);

    return {
        aiApiKey,
        aiEnabled,
        isLoadingAI,
        aiError,
        validateAndSetApiKey,
        disableAI
    };
};

export default {
    usePowerballData,
    useHistoricalData,
    useAppState,
    useAIIntegration
};