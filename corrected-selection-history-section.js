// This is the corrected selection history section that fixes the syntax error
// and implements the enhanced display with both arrays combined

// The key fix is properly closing the IIFE (Immediately Invoked Function Expression)
// and providing the correct structure for the React.createElement calls

selectionHistory.length > 0 || savedSelections.length > 0 ? React.createElement('div', { className: 'space-y-3' },
    (() => {
        // Combine both selectionHistory and savedSelections for display
        const allSelections = [
            ...selectionHistory.map(entry => ({ ...entry, source: entry.source || 'Manual Entry', type: 'history' })),
            ...savedSelections.map(entry => ({ ...entry, source: entry.source || 'Saved Selection', type: 'saved' }))
        ];

        // Sort by timestamp/dateSaved (newest first)
        allSelections.sort((a, b) => {
            const dateA = new Date(a.dateSaved || a.timestamp || 0);
            const dateB = new Date(b.dateSaved || b.timestamp || 0);
            return dateB - dateA;
        });

        return allSelections.map(entry => {
            const isWin = entry.result === 'win';
            const isLoss = entry.result === 'loss';
            const isSaved = entry.type === 'saved';

            return React.createElement('div', {
                key: entry.id,
                className: 'p-3 border rounded-lg transition-all hover:shadow-sm ' + (
                    isWin ? 'border-green-200 bg-green-50' :
                    isLoss ? 'border-red-200 bg-red-50' :
                    isSaved ? 'border-blue-200 bg-blue-50' :
                    'border-gray-200 bg-gray-50'
                )
            },
                // Compact header
                React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                    React.createElement('div', { className: 'flex items-center gap-2' },
                        React.createElement('h4', { className: 'font-medium text-sm' }, 
                            entry.name || entry.strategy || (isSaved ? 'Saved Selection' : 'Manual Entry')
                        ),
                        isSaved ? React.createElement('span', {
                            className: 'px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium'
                        }, '💾 Saved') : null,
                        entry.claudeGenerated ? React.createElement('span', {
                            className: 'px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium'
                        }, '🤖 AI') : null,
                        entry.autoSaved ? React.createElement('span', {
                            className: 'px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium'
                        }, '⚡ Auto') : null
                    ),
                    React.createElement('div', { className: 'flex items-center gap-2' },
                        React.createElement('span', {
                            className: 'px-2 py-0.5 rounded text-xs font-medium ' + (
                                isWin ? 'bg-green-100 text-green-800' :
                                isLoss ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                            )
                        }, isWin ? '🏆' : isLoss ? '❌' : '⏳'),
                        React.createElement('select', {
                            value: entry.result || 'pending',
                            onChange: (e) => {
                                const newResult = e.target.value;
                                if (newResult === 'win') {
                                    const winAmount = prompt('Enter win amount (e.g., 4.00):');
                                    if (winAmount !== null) {
                                        updateSelectionResult(entry.id, newResult, winAmount);
                                    }
                                } else {
                                    updateSelectionResult(entry.id, newResult, 0);
                                }
                            },
                            className: 'text-xs px-1 py-0.5 border rounded'
                        },
                            React.createElement('option', { value: 'pending' }, 'Pending'),
                            React.createElement('option', { value: 'win' }, 'Win'),
                            React.createElement('option', { value: 'loss' }, 'Loss')
                        ),
                        React.createElement('button', {
                            onClick: () => deleteSelectionEntry(entry.id),
                            className: 'text-red-600 hover:text-red-800 text-xs px-1'
                        }, '🗑️')
                    )
                ),
                // Numbers (compact)
                React.createElement('div', { className: 'flex items-center gap-3 mb-1' },
                    React.createElement('div', { className: 'flex gap-1' },
                        (entry.numbers || []).map(num =>
                            React.createElement('span', {
                                key: num,
                                className: 'number-display text-xs px-1.5 py-0.5'
                            }, num)
                        )
                    ),
                    entry.powerball ? React.createElement('span', { 
                        className: 'powerball-display text-xs px-1.5 py-0.5' 
                    }, 'PB: ' + entry.powerball) : null,
                    entry.winAmount > 0 ? React.createElement('span', { 
                        className: 'font-medium text-green-600 text-xs' 
                    }, '$' + entry.winAmount.toFixed(2)) : null
                ),
                // Details (compact)
                React.createElement('div', { className: 'flex items-center justify-between text-xs text-gray-600' },
                    React.createElement('div', { className: 'flex items-center gap-3' },
                        React.createElement('span', null, 
                            'Saved: ' + new Date(entry.dateSaved || entry.timestamp).toLocaleDateString()
                        ),
                        entry.datePlayed ? React.createElement('span', null, 
                            'Played: ' + new Date(entry.datePlayed).toLocaleDateString()
                        ) : null,
                        entry.confidence ? React.createElement('span', null, 
                            entry.confidence + '% confidence'
                        ) : null
                    ),
                    React.createElement('div', { className: 'flex items-center gap-2' },
                        entry.drawingInfo?.targetDrawingDate ? React.createElement('span', { 
                            className: 'text-blue-600' 
                        }, `🎯 ${entry.drawingInfo.drawingDisplayDate || entry.drawingInfo.targetDrawingDate}`) : null,
                        React.createElement('span', { className: 'text-gray-500' }, entry.source)
                    )
                ),
                // Notes (if any, compact)
                entry.notes ? React.createElement('p', { 
                    className: 'text-xs text-gray-600 mt-2 italic' 
                }, entry.notes) : null
            );
        });
    })() // This is the key fix - properly closing the IIFE
) : React.createElement('div', { className: 'mb-4' },
    // Rest of the code continues here...
)