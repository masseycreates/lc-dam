import React from 'react';
import { usePowerballData, useHistoricalData, useAppState, useAIIntegration } from '../hooks/useAppData.js';
import QuickSelection from './QuickSelection.js';
import TaxCalculator from './TaxCalculator.js';
import LotteryAlgorithms from '../utils/LotteryAlgorithms.js';
import { UI_CONFIG } from '../config/constants.js';

function AdvancedLotterySystem() {
    // Custom hooks for data management
    const {
        currentJackpot,
        nextDrawDate,
        liveDataAvailable,
        dataStatus,
        isUpdating,
        lastUpdated,
        refreshData
    } = usePowerballData();

    const {
        historicalStats,
        historicalDataAvailable,
        isLoadingHistory,
        historicalRecordsLimit,
        updateLimit,
        refreshHistoricalData
    } = useHistoricalData();

    const {
        activeTab,
        selectedNumbers,
        powerball,
        quickSelectionSets,
        systemPerformance,
        setActiveTab,
        updateSelectedNumbers,
        updatePowerball,
        updateQuickSelectionSets,
        resetSelections
    } = useAppState();

    const {
        aiApiKey,
        aiEnabled,
        isLoadingAI,
        aiError,
        validateAndSetApiKey,
        disableAI
    } = useAIIntegration();

    const lotteryAlgorithms = new LotteryAlgorithms();

    // Handle number selection from QuickSelection component
    const handleNumbersSelected = (numbers, pb) => {
        updateSelectedNumbers(numbers);
        updatePowerball(pb);
        setActiveTab(UI_CONFIG.TABS.CALCULATOR);
    };

    // Generate advanced quick selection
    const generateAdvancedQuickSelection = async () => {
        if (historicalStats) {
            const results = await lotteryAlgorithms.generateAdvancedQuickSelection(historicalStats);
            updateQuickSelectionSets(results);
        }
    };

    // Render jackpot display
    const renderJackpotDisplay = () => {
        return React.createElement('div', { 
            className: `card ${liveDataAvailable ? 'gradient-bg' : 'gradient-bg-unavailable'} text-white mb-6`
        },
            React.createElement('div', { className: 'relative z-10' },
                React.createElement('div', { className: 'text-center' },
                    React.createElement('h1', { className: 'text-2xl md:text-3xl font-bold mb-2' },
                        '🎰 Advanced Lottery Intelligence System'
                    ),
                    React.createElement('p', { className: 'text-lg opacity-90' },
                        'Claude Opus 4 + 6 Algorithms Hybrid'
                    )
                ),

                currentJackpot ? React.createElement('div', { className: 'mt-6 text-center' },
                    React.createElement('div', { className: 'text-4xl md:text-5xl font-bold mb-2' },
                        '$', currentJackpot.amount?.toLocaleString() || 'Unknown'
                    ),
                    React.createElement('div', { className: 'text-lg opacity-90' },
                        'Current Powerball Jackpot'
                    ),
                    currentJackpot.cashValue ? React.createElement('div', { className: 'text-sm opacity-80 mt-1' },
                        'Cash Value: $', currentJackpot.cashValue.toLocaleString()
                    ) : null,
                    nextDrawDate ? React.createElement('div', { className: 'text-sm opacity-80 mt-2' },
                        'Next Drawing: ', nextDrawDate
                    ) : null
                ) : React.createElement('div', { className: 'mt-6 text-center' },
                    React.createElement('div', { className: 'text-2xl font-bold mb-2' },
                        'Jackpot Data Unavailable'
                    ),
                    React.createElement('div', { className: 'text-sm opacity-80' },
                        'System running in offline mode'
                    )
                ),

                React.createElement('div', { className: 'mt-4 flex justify-center gap-4' },
                    React.createElement('button', {
                        onClick: refreshData,
                        disabled: isUpdating,
                        className: 'btn btn-secondary btn-sm'
                    }, isUpdating ? '⏳ Updating...' : '🔄 Refresh Data'),
                    
                    React.createElement('button', {
                        onClick: generateAdvancedQuickSelection,
                        className: 'btn btn-secondary btn-sm'
                    }, '🎲 Quick Pick')
                )
            )
        );
    };

    // Render AI configuration
    const renderAIConfiguration = () => {
        return React.createElement('div', { className: 'card mb-6' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4' },
                '🤖 Claude Opus 4 AI Configuration'
            ),
            
            !aiEnabled ? React.createElement('div', null,
                React.createElement('div', { className: 'mb-4' },
                    React.createElement('label', { className: 'block text-sm font-medium mb-2' },
                        'Claude API Key (Optional - Enables AI-Enhanced Predictions)'
                    ),
                    React.createElement('input', {
                        type: 'password',
                        placeholder: 'sk-ant-...',
                        className: 'w-full p-2 border border-gray-300 rounded-md',
                        onChange: (e) => validateAndSetApiKey(e.target.value)
                    })
                ),
                React.createElement('div', { className: 'text-sm text-gray-600' },
                    React.createElement('p', null, '• Get your API key from ', 
                        React.createElement('a', { 
                            href: 'https://console.anthropic.com/', 
                            target: '_blank',
                            className: 'text-blue-600 hover:underline'
                        }, 'Anthropic Console')
                    ),
                    React.createElement('p', null, '• AI analysis provides enhanced number predictions'),
                    React.createElement('p', null, '• System works without API key using local algorithms')
                )
            ) : React.createElement('div', null,
                React.createElement('div', { className: 'success-banner' },
                    '✅ Claude Opus 4 AI is active and ready for enhanced predictions!'
                ),
                React.createElement('button', {
                    onClick: disableAI,
                    className: 'btn btn-secondary btn-sm mt-2'
                }, '🔒 Disable AI')
            ),

            aiError ? React.createElement('div', { className: 'error-banner mt-2' }, aiError) : null,
            isLoadingAI ? React.createElement('div', { className: 'text-center mt-2' },
                React.createElement('div', { className: 'spinner' })
            ) : null
        );
    };

    // Render data status
    const renderDataStatus = () => {
        return React.createElement('div', { className: 'mb-4' },
            React.createElement('div', { className: 'flex items-center justify-between text-sm' },
                React.createElement('div', { className: 'flex items-center gap-4' },
                    React.createElement('span', { 
                        className: liveDataAvailable ? 'text-green-600' : 'text-orange-600'
                    }, dataStatus),
                    lastUpdated ? React.createElement('span', { className: 'text-gray-500' },
                        'Updated: ', lastUpdated
                    ) : null
                ),
                React.createElement('div', { className: 'flex items-center gap-4' },
                    React.createElement('span', { 
                        className: historicalDataAvailable ? 'text-green-600' : 'text-orange-600'
                    }, 
                        historicalDataAvailable 
                            ? `📊 ${historicalStats?.totalDrawings || 0} drawings loaded`
                            : '📊 Historical data unavailable'
                    ),
                    isLoadingHistory ? React.createElement('div', { className: 'spinner' }) : null
                )
            )
        );
    };

    // Render tab content
    const renderTabContent = () => {
        switch (activeTab) {
            case UI_CONFIG.TABS.QUICK_SELECTION:
                return React.createElement(QuickSelection, {
                    historicalStats,
                    aiEnabled,
                    aiApiKey,
                    onNumbersSelected: handleNumbersSelected,
                    quickSelectionSets,
                    setQuickSelectionSets: updateQuickSelectionSets
                });

            case UI_CONFIG.TABS.TAX_CALCULATOR:
                return React.createElement(TaxCalculator);

            case UI_CONFIG.TABS.CALCULATOR:
                return React.createElement('div', { className: 'card' },
                    React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, '🎯 Number Calculator'),
                    React.createElement('p', null, 'Manual number selection and calculation features coming soon...')
                );

            case UI_CONFIG.TABS.ANALYSIS:
                return React.createElement('div', { className: 'card' },
                    React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, '📊 Statistical Analysis'),
                    React.createElement('p', null, 'Advanced statistical analysis features coming soon...')
                );

            default:
                return null;
        }
    };

    return React.createElement('div', { className: 'min-h-screen bg-gray-50' },
        React.createElement('div', { className: 'container mx-auto px-4 py-6' },
            renderJackpotDisplay(),
            renderAIConfiguration(),
            renderDataStatus(),

            React.createElement('div', { className: 'mb-4' },
                React.createElement('div', { className: 'flex border-b border-gray-200' },
                    [
                        { id: UI_CONFIG.TABS.QUICK_SELECTION, label: aiEnabled ? '🤖✨ AI Hybrid' : '🧮 Algorithms', icon: aiEnabled ? '🤖✨' : '🧮' },
                        { id: UI_CONFIG.TABS.CALCULATOR, label: '🎯 Calculator', icon: '🎯' },
                        { id: UI_CONFIG.TABS.TAX_CALCULATOR, label: '💰 Tax Calculator', icon: '💰' },
                        { id: UI_CONFIG.TABS.ANALYSIS, label: '📊 Analysis', icon: '📊' }
                    ].map(tab =>
                        React.createElement('button', {
                            key: tab.id,
                            onClick: () => setActiveTab(tab.id),
                            className: 'px-3 py-2 text-sm font-medium border-b-2 transition-colors ' + (
                                activeTab === tab.id 
                                    ? 'border-blue-500 text-blue-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            )
                        },
                            tab.icon, ' ', tab.label
                        )
                    )
                )
            ),

            renderTabContent(),

            React.createElement('div', { className: 'mt-6 text-center text-xs text-gray-500' },
                React.createElement('p', null, 
                    '🎰 Claude Opus 4 + 6 Algorithms Hybrid Lottery System • Educational purposes only'
                ),
                React.createElement('p', { className: 'mt-1' },
                    'Data: ',
                    React.createElement('span', { 
                        className: liveDataAvailable ? 'text-green-600' : 'text-orange-600'
                    }, liveDataAvailable ? 'Live Connected' : 'Offline'),
                    ' • AI: ',
                    React.createElement('span', { 
                        className: aiEnabled ? 'text-purple-600' : 'text-gray-600'
                    }, aiEnabled ? 'Opus 4 Active' : 'Local Only'),
                    historicalStats ? ' • Using ' + historicalStats.totalDrawings + ' drawings' : ''
                )
            )
        )
    );
}

export default AdvancedLotterySystem;