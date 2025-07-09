import React, { useState, useEffect } from 'react';
import LotteryAlgorithms from '../utils/LotteryAlgorithms.js';
import ClaudeService from '../services/ClaudeService.js';
import { ALGORITHM_CONFIG } from '../config/constants.js';
import { handleApiError, trackPerformance } from '../utils/helpers.js';

function QuickSelection({ 
    historicalStats, 
    aiEnabled, 
    aiApiKey, 
    onNumbersSelected,
    quickSelectionSets,
    setQuickSelectionSets 
}) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState(null);
    const [selectedAlgorithm, setSelectedAlgorithm] = useState('hybrid');
    const [numberOfSets, setNumberOfSets] = useState(5);

    const lotteryAlgorithms = new LotteryAlgorithms();
    const claudeService = new ClaudeService();

    const generateQuickSelection = async () => {
        const startTime = performance.now();
        setIsGenerating(true);
        setGenerationError(null);

        try {
            let results = [];

            if (aiEnabled && aiApiKey && selectedAlgorithm === 'hybrid') {
                // Use AI-enhanced hybrid approach
                try {
                    const localResults = lotteryAlgorithms.hybridAnalysis(historicalStats, numberOfSets);
                    const aiResponse = await claudeService.generateHybridPredictions(
                        aiApiKey, 
                        historicalStats, 
                        localResults
                    );

                    if (aiResponse.success && aiResponse.predictions) {
                        results = aiResponse.predictions.map(pred => ({
                            ...pred,
                            algorithm: 'hybrid_ai',
                            confidence: Math.min(0.9, pred.confidence + 0.1)
                        }));
                    } else {
                        // Fallback to local algorithms
                        results = localResults;
                    }
                } catch (aiError) {
                    console.warn('AI generation failed, falling back to local algorithms:', aiError);
                    results = lotteryAlgorithms.hybridAnalysis(historicalStats, numberOfSets);
                }
            } else {
                // Use local algorithms only
                if (selectedAlgorithm === 'all') {
                    // Generate one set from each algorithm
                    const algorithms = ['frequency', 'hot_cold', 'pattern', 'statistical', 'random'];
                    results = [];
                    algorithms.forEach(algorithm => {
                        const sets = lotteryAlgorithms.algorithms[algorithm](historicalStats, 1);
                        if (sets.length > 0) {
                            results.push(sets[0]);
                        }
                    });
                } else {
                    results = lotteryAlgorithms.algorithms[selectedAlgorithm](historicalStats, numberOfSets);
                }
            }

            setQuickSelectionSets(results);
            
        } catch (error) {
            const errorMessage = handleApiError(error, 'Quick Selection');
            setGenerationError(errorMessage);
        } finally {
            setIsGenerating(false);
            trackPerformance('generateQuickSelection', startTime);
        }
    };

    const selectNumbers = (numbers, powerball) => {
        onNumbersSelected(numbers, powerball);
    };

    const renderNumberSet = (set, index) => {
        const algorithmConfig = ALGORITHM_CONFIG[set.algorithm.toUpperCase()] || ALGORITHM_CONFIG.HYBRID;
        
        return React.createElement('div', {
            key: index,
            className: `card hover:shadow-lg transition-shadow cursor-pointer ${
                set.algorithm === 'hybrid_ai' ? 'border-purple-200 bg-purple-50' : ''
            }`
        },
            React.createElement('div', { className: 'flex items-center justify-between mb-3' },
                React.createElement('div', { className: 'flex items-center gap-2' },
                    React.createElement('span', { className: 'text-lg' }, algorithmConfig.ICON),
                    React.createElement('div', null,
                        React.createElement('h4', { className: 'font-semibold text-sm' }, 
                            set.algorithm === 'hybrid_ai' ? '🤖 AI Enhanced Hybrid' : algorithmConfig.NAME
                        ),
                        React.createElement('p', { className: 'text-xs text-gray-600' }, algorithmConfig.DESCRIPTION)
                    )
                ),
                React.createElement('div', { className: 'text-right' },
                    React.createElement('div', { 
                        className: `text-xs px-2 py-1 rounded-full ${
                            set.confidence >= 0.7 ? 'bg-green-100 text-green-800' :
                            set.confidence >= 0.5 ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`
                    }, `${Math.round(set.confidence * 100)}% confidence`)
                )
            ),

            React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('div', { className: 'flex items-center gap-2' },
                    React.createElement('div', { className: 'flex gap-1' },
                        set.numbers.map(num => 
                            React.createElement('span', {
                                key: num,
                                className: `number-display ${set.algorithm === 'hybrid_ai' ? 'opus4-number' : ''}`
                            }, num)
                        )
                    ),
                    React.createElement('span', { 
                        className: `powerball-display ${set.algorithm === 'hybrid_ai' ? 'opus4-powerball' : ''}`
                    }, set.powerball)
                ),
                React.createElement('button', {
                    onClick: () => selectNumbers(set.numbers, set.powerball),
                    className: 'btn btn-sm btn-primary'
                }, '✓ Select')
            )
        );
    };

    useEffect(() => {
        // Generate initial quick selection when component mounts
        if (historicalStats) {
            generateQuickSelection();
        }
    }, [historicalStats, aiEnabled]);

    return React.createElement('div', { className: 'space-y-6' },
        React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, 
                aiEnabled ? '🤖✨ AI-Enhanced Quick Selection' : '🧮 Algorithm-Based Quick Selection'
            ),
            
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-4' },
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Algorithm'),
                    React.createElement('select', {
                        value: selectedAlgorithm,
                        onChange: (e) => setSelectedAlgorithm(e.target.value),
                        className: 'w-full p-2 border border-gray-300 rounded-md'
                    },
                        aiEnabled ? React.createElement('option', { value: 'hybrid' }, '🤖 AI + Hybrid') : null,
                        React.createElement('option', { value: 'all' }, '🎯 All Algorithms'),
                        React.createElement('option', { value: 'frequency' }, '📊 Frequency Analysis'),
                        React.createElement('option', { value: 'hot_cold' }, '🔥 Hot & Cold'),
                        React.createElement('option', { value: 'pattern' }, '🔍 Pattern Analysis'),
                        React.createElement('option', { value: 'statistical' }, '📈 Statistical'),
                        React.createElement('option', { value: 'random' }, '🎲 Random')
                    )
                ),
                
                selectedAlgorithm !== 'all' ? React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Number of Sets'),
                    React.createElement('select', {
                        value: numberOfSets,
                        onChange: (e) => setNumberOfSets(parseInt(e.target.value)),
                        className: 'w-full p-2 border border-gray-300 rounded-md'
                    },
                        React.createElement('option', { value: 1 }, '1 Set'),
                        React.createElement('option', { value: 3 }, '3 Sets'),
                        React.createElement('option', { value: 5 }, '5 Sets'),
                        React.createElement('option', { value: 10 }, '10 Sets')
                    )
                ) : null,

                React.createElement('div', { className: 'flex items-end' },
                    React.createElement('button', {
                        onClick: generateQuickSelection,
                        disabled: isGenerating,
                        className: 'btn btn-primary w-full'
                    }, 
                        isGenerating ? '⏳ Generating...' : '🎲 Generate Numbers'
                    )
                )
            ),

            generationError ? React.createElement('div', { className: 'error-banner' }, generationError) : null
        ),

        quickSelectionSets.length > 0 ? React.createElement('div', { className: 'space-y-4' },
            React.createElement('h4', { className: 'text-lg font-semibold' }, 
                `🎯 Generated Number Sets (${quickSelectionSets.length})`
            ),
            React.createElement('div', { className: 'selection-grid' },
                quickSelectionSets.map((set, index) => renderNumberSet(set, index))
            )
        ) : null,

        React.createElement('div', { className: 'card bg-blue-50 border-blue-200' },
            React.createElement('h4', { className: 'font-semibold mb-2 text-blue-800' }, '💡 How It Works'),
            React.createElement('div', { className: 'text-sm text-blue-700 space-y-2' },
                React.createElement('p', null, 
                    '• ', React.createElement('strong', null, 'Frequency Analysis:'), ' Analyzes how often numbers have been drawn'
                ),
                React.createElement('p', null, 
                    '• ', React.createElement('strong', null, 'Hot & Cold:'), ' Identifies trending and overdue numbers'
                ),
                React.createElement('p', null, 
                    '• ', React.createElement('strong', null, 'Pattern Analysis:'), ' Looks for sequences and patterns'
                ),
                React.createElement('p', null, 
                    '• ', React.createElement('strong', null, 'Statistical:'), ' Uses mathematical distributions'
                ),
                aiEnabled ? React.createElement('p', null, 
                    '• ', React.createElement('strong', null, 'AI Enhanced:'), ' Claude Opus 4 analyzes all data for optimal predictions'
                ) : null,
                React.createElement('p', { className: 'text-xs mt-3 text-blue-600' },
                    '⚠️ Remember: Lottery drawings are random. These algorithms provide educated guesses based on historical data.'
                )
            )
        )
    );
}

export default QuickSelection;