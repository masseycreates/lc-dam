// Manual Calculator Component
function ManualCalculator({
    selectedNumbers,
    powerball,
    toggleNumber,
    clearSelection,
    quickPick,
    setPowerball
}) {
    const { useState } = React;

    return React.createElement('div', { className: 'space-y-6' },
        React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, '🎯 Manual Number Selection'),
            
            React.createElement('div', { className: 'mb-6' },
                React.createElement('h4', { className: 'text-sm font-medium mb-2' }, 'Your Selection:'),
                React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
                    React.createElement('div', { className: 'flex gap-2' },
                        selectedNumbers.length > 0 ? selectedNumbers.map(num => 
                            React.createElement('span', { 
                                key: num, 
                                className: 'number-display'
                            }, num)
                        ) : React.createElement('span', { className: 'text-gray-400' }, 'Select 5 numbers')
                    ),
                    React.createElement('div', null,
                        powerball ? React.createElement('span', { className: 'powerball-display' }, `PB: ${powerball}`) :
                        React.createElement('span', { className: 'text-gray-400' }, 'Select Powerball')
                    )
                ),
                React.createElement('div', { className: 'flex gap-2' },
                    React.createElement('button', {
                        onClick: quickPick,
                        className: 'btn btn-primary'
                    }, '🎲 Quick Pick'),
                    React.createElement('button', {
                        onClick: clearSelection,
                        className: 'btn btn-secondary'
                    }, '🗑️ Clear'),
                    selectedNumbers.length === 5 && powerball ? React.createElement('button', {
                        onClick: () => {
                            const ticket = `${selectedNumbers.join(', ')} | PB: ${powerball}`;
                            window.AppHelpers.copyToClipboard(ticket).then(() => {
                                console.log('Selection copied to clipboard');
                            }).catch(() => {
                                alert('Selection copied to clipboard!');
                            });
                        },
                        className: 'btn btn-secondary'
                    }, '📋 Copy') : null
                )
            ),

            React.createElement('div', null,
                React.createElement('h4', { className: 'text-sm font-medium mb-2' }, 'Main Numbers (1-69):'),
                React.createElement('div', { className: 'grid grid-cols-10 gap-2 mb-6' },
                    Array.from({ length: 69 }, (_, i) => i + 1).map(num =>
                        React.createElement('button', {
                            key: num,
                            onClick: () => toggleNumber(num),
                            className: `w-10 h-10 text-sm border rounded transition-colors ${
                                selectedNumbers.includes(num) 
                                    ? 'bg-blue-500 text-white border-blue-500' 
                                    : 'bg-white border-gray-300 hover:bg-gray-50'
                            } ${selectedNumbers.length >= 5 && !selectedNumbers.includes(num) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`
                        }, num)
                    )
                ),

                React.createElement('h4', { className: 'text-sm font-medium mb-2' }, 'Powerball (1-26):'),
                React.createElement('div', { className: 'grid grid-cols-13 gap-2' },
                    Array.from({ length: 26 }, (_, i) => i + 1).map(num =>
                        React.createElement('button', {
                            key: num,
                            onClick: () => setPowerball(num),
                            className: `w-10 h-10 text-sm border rounded transition-colors ${
                                powerball === num 
                                    ? 'bg-red-500 text-white border-red-500' 
                                    : 'bg-white border-gray-300 hover:bg-gray-50'
                            } cursor-pointer`
                        }, num)
                    )
                )
            )
        ),

        // Selection Tips
        React.createElement('div', { className: 'card' },
            React.createElement('h4', { className: 'text-lg font-semibold mb-3' }, '💡 Selection Tips'),
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                React.createElement('div', { className: 'space-y-2' },
                    React.createElement('h5', { className: 'font-medium text-sm' }, '🎯 Strategy Tips'),
                    React.createElement('ul', { className: 'text-xs text-gray-600 space-y-1' },
                        React.createElement('li', null, '• Mix high and low numbers'),
                        React.createElement('li', null, '• Include both odd and even numbers'),
                        React.createElement('li', null, '• Avoid consecutive sequences'),
                        React.createElement('li', null, '• Consider number spread across ranges')
                    )
                ),
                React.createElement('div', { className: 'space-y-2' },
                    React.createElement('h5', { className: 'font-medium text-sm' }, '📊 Quick Stats'),
                    React.createElement('div', { className: 'text-xs text-gray-600 space-y-1' },
                        React.createElement('div', null, `Odd numbers: ${selectedNumbers.filter(n => n % 2 === 1).length}/5`),
                        React.createElement('div', null, `Even numbers: ${selectedNumbers.filter(n => n % 2 === 0).length}/5`),
                        selectedNumbers.length === 5 ? React.createElement('div', null, 
                            `Sum: ${selectedNumbers.reduce((a, b) => a + b, 0)}`
                        ) : null,
                        selectedNumbers.length === 5 ? React.createElement('div', null, 
                            `Range: ${Math.max(...selectedNumbers) - Math.min(...selectedNumbers)}`
                        ) : null
                    )
                )
            )
        ),

        // Recent Quick Picks
        React.createElement('div', { className: 'card' },
            React.createElement('h4', { className: 'text-lg font-semibold mb-3' }, '🎲 Quick Pick Generator'),
            React.createElement('p', { className: 'text-sm text-gray-600 mb-3' }, 
                'Generate random number combinations with one click'
            ),
            React.createElement('div', { className: 'flex gap-2' },
                React.createElement('button', {
                    onClick: quickPick,
                    className: 'btn btn-primary'
                }, '🎲 Generate New Quick Pick'),
                React.createElement('button', {
                    onClick: () => {
                        // Generate 5 quick picks
                        const quickPicks = [];
                        for (let i = 0; i < 5; i++) {
                            const numbers = [];
                            while (numbers.length < 5) {
                                const num = Math.floor(Math.random() * 69) + 1;
                                if (!numbers.includes(num)) numbers.push(num);
                            }
                            const pb = Math.floor(Math.random() * 26) + 1;
                            quickPicks.push(`${numbers.sort((a, b) => a - b).join(', ')} | PB: ${pb}`);
                        }
                        
                        const allPicks = quickPicks.join('\n');
                        window.AppHelpers.copyToClipboard(allPicks).then(() => {
                            alert('5 Quick Picks copied to clipboard!');
                        }).catch(() => {
                            alert('5 Quick Picks generated!\n\n' + allPicks);
                        });
                    },
                    className: 'btn btn-secondary'
                }, '📋 Generate 5 Quick Picks')
            )
        )
    );
}

// Export component
window.ManualCalculator = ManualCalculator;