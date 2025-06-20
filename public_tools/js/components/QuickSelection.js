// Quick Selection Component - FIXED SYNTAX ERROR
function QuickSelection({
    historicalStats,
    historicalRecordsLimit,
    dataLimitOptions,
    isLoadingHistory,
    handleDataLimitChange,
    aiEnabled,
    aiApiKey,
    setAiApiKey,
    enableAI,
    isLoadingAI,
    generateClaudeHybridSelection,
    quickSelectionSets,
    generateAdvancedQuickSelection
}) {
    const { useState } = React;

    const copyToClipboard = (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                console.log('Copied to clipboard');
            }).catch(() => {
                alert('Selection copied!');
            });
        } else {
            alert('Selection: ' + text);
        }
    };

    const getConfidenceClass = (confidence) => {
        if (confidence >= 85) return 'border-l-4 border-green-500';
        if (confidence >= 75) return 'border-l-4 border-blue-500';
        return 'border-l-4 border-yellow-500';
    };

    return React.createElement('div', { className: 'space-y-4' },
        // Data Selector
        React.createElement('div', { 
            className: 'bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-lg p-4'
        },
            React.createElement('div', { 
                className: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3' 
            },
                React.createElement('div', null,
                    React.createElement('h4', { className: 'text-sm font-semibold text-gray-700' }, 
                        '📊 Historical Data Range'
                    ),
                    React.createElement('p', { className: 'text-xs text-gray-600' }, 
                        'Currently using ' + historicalRecordsLimit + ' historical drawings for analysis'
                    )
                ),
                React.createElement('div', { className: 'flex gap-2' },
                    React.createElement('select', {
                        value: historicalRecordsLimit,
                        onChange: (e) => handleDataLimitChange(parseInt(e.target.value)),
                        disabled: isLoadingHistory,
                        className: 'px-3 py-1 border border-gray-300 rounded text-sm bg-white'
                    },
                        dataLimitOptions.map(option =>
                            React.createElement('option', { 
                                key: option.value, 
                                value: option.value 
                            }, option.label)
                        )
                    ),
                    React.createElement('button', {
                        onClick: () => generateAdvancedQuickSelection(),
                        disabled: isLoadingHistory,
                        className: isLoadingHistory 
                            ? 'px-3 py-1 text-sm rounded bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'px-3 py-1 text-sm rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors'
                    }, isLoadingHistory ? '⏳ Loading...' : '🔄 Regenerate')
                )
            )
        ),

        // Claude AI Section
        !aiEnabled ? React.createElement('div', { 
            className: 'bg-white border-2 border-gray-200 rounded-lg p-4'
        },
            React.createElement('h4', { className: 'text-lg font-semibold mb-3 flex items-center gap-2' }, 
                '🤖', 'Enable Claude AI Hybrid Analysis'
            ),
            React.createElement('p', { className: 'text-sm text-gray-600 mb-4' },
                'Upgrade to hybrid Claude AI + 6 Algorithms analysis for enhanced predictions.'
            ),
            React.createElement('div', { className: 'flex gap-3 items-end' },
                React.createElement('div', { className: 'flex-1' },
                    React.createElement('label', { 
                        className: 'block text-sm font-medium text-gray-700 mb-1' 
                    }, 'Anthropic API Key'),
                    React.createElement('input', {
                        type: 'password',
                        value: aiApiKey,
                        onChange: (e) => setAiApiKey(e.target.value),
                        placeholder: 'sk-ant-...',
                        className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm',
                        disabled: isLoadingAI
                    })
                ),
                React.createElement('button', {
                    onClick: enableAI,
                    disabled: isLoadingAI || !aiApiKey.trim(),
                    className: (isLoadingAI || !aiApiKey.trim())
                        ? 'px-4 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors'
                }, isLoadingAI ? '⏳ Connecting...' : '🚀 Enable AI')
            ),
            React.createElement('p', { className: 'text-xs text-gray-500 mt-2' },
                'Get your API key from ',
                React.createElement('a', { 
                    href: 'https://console.anthropic.com/', 
                    target: '_blank',
                    className: 'text-blue-600 hover:underline'
                }, 'console.anthropic.com'),
                '. Your key is stored locally and never shared.'
            )
        ) : React.createElement('div', { 
            className: 'bg-green-50 border-2 border-green-200 rounded-lg p-3'
        },
            React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-green-800 font-medium' }, 
                    '🤖✅ Claude AI Hybrid System Active'
                ),
                React.createElement('button', {
                    onClick: generateClaudeHybridSelection,
                    disabled: isLoadingAI,
                    className: isLoadingAI 
                        ? 'px-3 py-1 text-sm rounded bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'px-3 py-1 text-sm rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors'
                }, isLoadingAI ? '⏳ Generating...' : '🤖🧮 Generate Hybrid')
            )
        ),

        // Selection Sets Display
        quickSelectionSets && quickSelectionSets.length > 0 ? 
            React.createElement('div', { 
                className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4'
            },
                quickSelectionSets.map(selection =>
                    React.createElement('div', { 
                        key: selection.id,
                        className: 'bg-white rounded-lg border-2 p-4 transition-all hover:shadow-md ' +
                            (selection.claudeGenerated || selection.isHybrid ? 
                                'border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50' : 
                                'border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50') +
                            ' ' + getConfidenceClass(selection.confidence)
                    },
                        React.createElement('div', { className: 'flex items-start justify-between mb-3' },
                            React.createElement('div', { className: 'flex-1' },
                                React.createElement('h4', { 
                                    className: 'font-semibold text-sm flex items-center gap-2 mb-1'
                                },
                                    selection.name,
                                    (selection.claudeGenerated || selection.isHybrid) ? 
                                        React.createElement('span', { 
                                            className: 'px-2 py-1 bg-purple-600 text-white rounded-full text-xs'
                                        }, 'AI') : null
                                ),
                                React.createElement('p', { className: 'text-xs text-gray-600' },
                                    selection.description.length > 100 ? 
                                        selection.description.substring(0, 100) + '...' : 
                                        selection.description
                                )
                            ),
                            React.createElement('span', { 
                                className: 'text-xs font-medium px-2 py-1 rounded ' +
                                    (selection.confidence >= 85 ? 'bg-green-100 text-green-800' :
                                    selection.confidence >= 75 ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800')
                            }, selection.strategy)
                        ),
                        
                        React.createElement('div', { className: 'flex items-center gap-4 mb-3' },
                            React.createElement('div', { className: 'flex gap-1' },
                                selection.numbers.map(num =>
                                    React.createElement('span', { 
                                        key: num, 
                                        className: 'bg-gray-100 border border-gray-300 px-2 py-1 rounded text-xs font-mono font-semibold'
                                    }, num)
                                )
                            ),
                            React.createElement('span', { 
                                className: 'bg-red-500 text-white px-2 py-1 rounded text-xs font-mono font-semibold'
                            }, 'PB: ' + selection.powerball)
                        ),

                        React.createElement('div', { className: 'flex justify-between items-center text-xs' },
                            React.createElement('span', { className: 'text-gray-500' },
                                selection.algorithmDetail || selection.technicalAnalysis
                            ),
                            React.createElement('button', {
                                onClick: () => {
                                    const ticket = selection.numbers.join(', ') + ' | PB: ' + selection.powerball;
                                    copyToClipboard(ticket);
                                },
                                className: 'px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors'
                            }, '📋 Copy')
                        )
                    )
                )
            ) :
            React.createElement('div', { 
                className: 'bg-white border-2 border-gray-200 rounded-lg p-8 text-center'
            },
                React.createElement('div', { className: 'text-4xl mb-4' }, '🎲'),
                React.createElement('p', { className: 'text-gray-600 mb-4' }, 
                    'Advanced lottery predictions will appear here'
                ),
                React.createElement('p', { className: 'text-xs text-gray-500' },
                    'Generate selections using local algorithms or enable Claude AI for hybrid analysis'
                )
            ),

        // Strategy Information
        React.createElement('div', { className: 'bg-white border-2 border-gray-200 rounded-lg p-4' },
            React.createElement('h4', { className: 'text-lg font-semibold mb-3' }, '🧠 Algorithm Strategies'),
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 text-sm' },
                React.createElement('div', null,
                    React.createElement('h5', { className: 'font-medium mb-2 text-blue-700' }, '📊 Local Algorithms (6)'),
                    React.createElement('ul', { className: 'space-y-1 text-xs text-gray-600' },
                        React.createElement('li', null, '• EWMA Frequency Analysis'),
                        React.createElement('li', null, '• Neural Network Pattern Recognition'),
                        React.createElement('li', null, '• Pair Relationship Analysis'),
                        React.createElement('li', null, '• Gap Pattern Optimization'),
                        React.createElement('li', null, '• Markov Chain Transitions'),
                        React.createElement('li', null, '• Sum Range Optimization')
                    )
                ),
                React.createElement('div', null,
                    React.createElement('h5', { className: 'font-medium mb-2' }, 
                        aiEnabled ? '🤖 Claude AI Hybrid (Active)' : '🤖 Claude AI (Disabled)'
                    ),
                    React.createElement('div', { className: 'text-xs text-gray-600 space-y-1' },
                        React.createElement('div', null, aiEnabled ? 
                            '✅ Combines local algorithms with Claude 3 AI' :
                            '⭕ Enable with API key for hybrid analysis'
                        ),
                        React.createElement('div', null, '• Advanced statistical validation'),
                        React.createElement('div', null, '• Pattern insight enhancement'),
                        React.createElement('div', null, '• Strategic confidence scoring')
                    )
                )
            ),
            React.createElement('div', { className: 'mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded' },
                React.createElement('p', { className: 'text-xs text-yellow-800' },
                    '⚠️ Educational purposes only. No system can guarantee lottery wins. ' +
                    'Past results do not predict future outcomes.'
                )
            )
        )
    );
}

// Export component
window.QuickSelection = QuickSelection;
