// Enhanced Selection History Section with Compact View Option
// Automatically switches to compact view for large datasets

// Check if we should use compact view
const shouldUseCompactView = (selectionHistory.length + savedSelections.length) > 10;

// If using compact view, render the compact component
if (shouldUseCompactView && window.renderCompactSelectionHistory) {
    // Render compact view
    selectionHistory.length > 0 || savedSelections.length > 0 ? 
        React.createElement('div', { className: 'space-y-3' },
            // Header with view toggle
            React.createElement('div', {
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #0ea5e9',
                    borderRadius: '6px',
                    marginBottom: '8px'
                }
            },
                React.createElement('div', null,
                    React.createElement('h3', { 
                        style: { margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#0369a1' }
                    }, `📊 Selection History (${selectionHistory.length + savedSelections.length} total)`),
                    React.createElement('p', { 
                        style: { margin: '4px 0 0 0', fontSize: '12px', color: '#0369a1' }
                    }, 'Compact view enabled for better performance')
                ),
                React.createElement('button', {
                    onClick: () => {
                        // Toggle to detailed view
                        localStorage.setItem('forceDetailedView', 'true');
                        if (window.refreshSelectionHistory) {
                            window.refreshSelectionHistory();
                        }
                    },
                    style: {
                        padding: '4px 8px',
                        border: '1px solid #0ea5e9',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        color: '#0369a1',
                        fontSize: '11px',
                        cursor: 'pointer'
                    }
                }, 'Switch to Detailed View')
            ),
            
            // Render compact history
            window.renderCompactSelectionHistory(selectionHistory, savedSelections)
        ) : 
        React.createElement('div', { className: 'mb-4' },
            React.createElement('p', { className: 'text-gray-600 text-center py-8' }, 
                'No selections saved yet. Your lottery number selections will appear here.'
            )
        )
} else {
    // Use detailed view (original code with some optimizations)
    selectionHistory.length > 0 || savedSelections.length > 0 ? React.createElement('div', { className: 'space-y-3' },
        // Header for detailed view
        (selectionHistory.length + savedSelections.length) > 5 ? React.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                backgroundColor: '#f9fafb',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                marginBottom: '8px'
            }
        },
            React.createElement('div', null,
                React.createElement('h3', { 
                    style: { margin: 0, fontSize: '14px', fontWeight: 'bold' }
                }, `📋 Selection History (${selectionHistory.length + savedSelections.length} total)`),
                React.createElement('p', { 
                    style: { margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }
                }, 'Detailed view - showing all information')
            ),
            React.createElement('button', {
                onClick: () => {
                    // Toggle to compact view
                    localStorage.removeItem('forceDetailedView');
                    if (window.refreshSelectionHistory) {
                        window.refreshSelectionHistory();
                    }
                },
                style: {
                    padding: '4px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    fontSize: '11px',
                    cursor: 'pointer'
                }
            }, 'Switch to Compact View')
        ) : null,
        
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

            // Limit to most recent 50 items in detailed view to prevent performance issues
            const displaySelections = allSelections.slice(0, 50);
            
            return [
                // Show truncation notice if we're limiting results
                allSelections.length > 50 ? React.createElement('div', {
                    key: 'truncation-notice',
                    style: {
                        padding: '8px 12px',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #f59e0b',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#92400e',
                        marginBottom: '8px'
                    }
                },
                    `⚠️ Showing most recent 50 of ${allSelections.length} selections. `,
                    React.createElement('button', {
                        onClick: () => {
                            localStorage.removeItem('forceDetailedView');
                            if (window.refreshSelectionHistory) {
                                window.refreshSelectionHistory();
                            }
                        },
                        style: {
                            textDecoration: 'underline',
                            background: 'none',
                            border: 'none',
                            color: '#92400e',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }
                    }, 'Switch to compact view to see all selections.')
                ) : null,
                
                // Render selections
                ...displaySelections.map(entry => {
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
                })
            ];
        })()
    ) : React.createElement('div', { className: 'mb-4' },
        React.createElement('p', { className: 'text-gray-600 text-center py-8' }, 
            'No selections saved yet. Your lottery number selections will appear here.'
        )
    )
}