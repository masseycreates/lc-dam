// PowerShell script to fix the broken selection history section
$content = Get-Content index.html -Raw

# Find the start of the problematic section (around line 3877)
$startPattern = "selectionHistory\.length > 0 \|\| savedSelections\.length > 0 \?"
$endPattern = "case 'calculator':"

# Extract the parts before and after the problematic section
$beforeMatch = $content -match "(.*)$startPattern"
$afterMatch = $content -match "$endPattern(.*)"

if ($beforeMatch -and $afterMatch) {
    $beforeSection = $matches[1]
    $afterSection = $endPattern + $matches[1]
    
    # The working replacement section
    $workingSection = @"
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

    return allSelections.length > 0 ? React.createElement('div', { className: 'space-y-3' },
        allSelections.map(entry => {
            const isWin = entry.result === 'win';
            const isLoss = entry.result === 'loss';
            const isPending = entry.result === 'pending';

            return React.createElement('div', {
                key: entry.id,
                className: 'p-4 border rounded-lg ' + (
                    isWin ? 'border-green-200 bg-green-50' :
                    isLoss ? 'border-red-200 bg-red-50' :
                    'border-gray-200 bg-gray-50'
                )
            },
                React.createElement('div', { className: 'flex items-start justify-between mb-2' },
                    React.createElement('div', null,
                        React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                            React.createElement('h4', { className: 'font-medium' }, entry.name || entry.strategy || 'Selection'),
                            // AI/Algorithm indicators
                            entry.claudeGenerated ? React.createElement('span', {
                                className: 'px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium'
                            }, '🤖 Claude Opus 4') : null,
                            entry.userEnhanced ? React.createElement('span', {
                                className: 'px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium'
                            }, '🧠 Enhanced AI') : null,
                            entry.autoSaved ? React.createElement('span', {
                                className: 'px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium'
                            }, '⚡ Auto-saved') : null,
                            entry.generationType ? React.createElement('span', {
                                className: 'px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium'
                            }, entry.generationType) : null
                        ),
                        React.createElement('p', { className: 'text-sm text-gray-600' },
                            entry.source + (entry.confidence ? ` • `${entry.confidence}% confidence` : '')
                        ),
                        // Drawing association info
                        entry.drawingInfo?.targetDrawingDate ? React.createElement('p', { className: 'text-xs text-blue-600 mt-1' },
                            `🎯 Target: `${entry.drawingInfo.drawingDisplayDate || entry.drawingInfo.targetDrawingDate} (`${entry.drawingInfo.drawingDay})`
                        ) : null
                    ),
                    React.createElement('div', { className: 'flex gap-2' },
                        // Status indicator
                        React.createElement('div', {
                            className: 'px-2 py-1 rounded text-xs font-medium ' + (
                                isWin ? 'bg-green-100 text-green-800' :
                                isLoss ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                            )
                        },
                            isWin ? '🏆 WIN' :
                            isLoss ? '❌ LOSS' :
                            '⏳ PENDING'
                        ),
                        React.createElement('select', {
                            value: entry.result,
                            onChange: (e) => {
                                const newResult = e.target.value;
                                if (newResult === 'win') {
                                    const winAmount = prompt('Enter win amount (e.g., 4.00):');
                                    if (winAmount !== null) {
                                        updateSelectionResult(entry.id, newResult, winAmount, entry.type);
                                    }
                                } else {
                                    updateSelectionResult(entry.id, newResult, 0);
                                }
                            },
                            className: 'text-xs px-2 py-1 border rounded'
                        },
                            React.createElement('option', { value: 'pending' }, 'Pending'),
                            React.createElement('option', { value: 'win' }, 'Win'),
                            React.createElement('option', { value: 'loss' }, 'Loss')
                        ),
                        React.createElement('button', {
                            onClick: () => deleteSelectionEntry(entry.id, entry.type),
                            className: 'text-red-600 hover:text-red-800 text-xs px-2 py-1'
                        }, '🗑️')
                    )
                ),

                React.createElement('div', { className: 'flex items-center gap-3 mb-2' },
                    React.createElement('div', { className: 'flex gap-1.5' },
                        entry.numbers.map(num =>
                            React.createElement('span', {
                                key: num,
                                className: 'number-display text-xs'
                            }, num)
                        )
                    ),
                    React.createElement('span', { className: 'powerball-display text-xs' }, 'PB: ' + entry.powerball),
                    // Win tier indicator
                    entry.winTier ? React.createElement('span', {
                        className: 'px-2 py-1 bg-gold-100 text-gold-800 rounded text-xs font-medium'
                    }, entry.winTier) : null
                ),

                React.createElement('div', { className: 'flex items-center justify-between text-xs text-gray-600' },
                    React.createElement('div', null,
                        React.createElement('span', null, 'Saved: ' + new Date(entry.dateSaved || entry.timestamp).toLocaleDateString()),
                        entry.datePlayed ? React.createElement('span', { className: 'ml-3' }, 'Played: ' + new Date(entry.datePlayed).toLocaleDateString()) : null,
                        entry.checkedAt ? React.createElement('span', { className: 'ml-3' }, 'Checked: ' + new Date(entry.checkedAt).toLocaleDateString()) : null
                    ),
                    entry.winAmount > 0 ? React.createElement('span', { className: 'font-medium text-green-600' }, '$' + entry.winAmount.toFixed(2)) : null
                ),

                entry.notes ? React.createElement('p', { className: 'text-xs text-gray-600 mt-2' }, entry.notes) : null
            );
        })
    ) : React.createElement('div', null,
        React.createElement('div', { className: 'mb-4' },
            React.createElement('button', {
                onClick: async () => {
                    console.log('🔄 Manual refresh triggered');
                    setIsLoadingUserData(true);
                    await initializeUserSession();
                    setIsLoadingUserData(false);
                },
                className: 'btn btn-secondary text-sm'
            }, '🔄 Refresh Data')
        ),

        // Manual drawing results check button (for testing)
        React.createElement('div', { className: 'mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg' },
            React.createElement('h4', { className: 'font-medium text-blue-900 mb-2' }, '🎯 Drawing Results Check'),
            React.createElement('p', { className: 'text-sm text-blue-700 mb-3' },
                'Manually check drawing results to update pending selections. This happens automatically, but you can trigger it manually.'
            ),
            React.createElement('button', {
                onClick: async () => {
                    setDataStatus('🎯 Checking recent drawing results...');
                    if (window.autoCheckRecentDrawings) {
                        await window.autoCheckRecentDrawings();
                    } else {
                        console.error('autoCheckRecentDrawings function not available');
                        setDataStatus('❌ Drawing results check function not available');
                        return;
                    }
                    setDataStatus('✅ Drawing results check completed');
                },
                className: 'btn btn-secondary btn-sm'
            }, '🔄 Check Recent Drawing Results')
        ),

        selectionHistory.length === 0 ? React.createElement('div', { className: 'text-center py-6 text-gray-500' },
            React.createElement('p', null, 'No selections saved yet.'),
            React.createElement('p', { className: 'text-sm mt-2' }, 'Save selections from the AI Hybrid tab or add previous selections manually.')
        ) : null
    );
})(),

                                // Manual drawing results check button (for testing)

                    "@ 
    
    # Combine the sections
    $fixedContent = $beforeSection + $workingSection + $afterSection
    
    # Write the fixed content back to the file
    Set-Content -Path index.html -Value $fixedContent
    Write-Host "File fixed successfully"
} else {
    Write-Host "Could not find the problematic section patterns"
}