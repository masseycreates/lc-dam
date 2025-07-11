// Test the exact replacement text
                                     }) : React.createElement('div', { className: 'text-center py-6 text-gray-500' },
                                         React.createElement('p', null, 'No selections saved yet.'),
                                         React.createElement('p', { className: 'text-sm mt-2' }, 'Save selections from the AI Hybrid tab or add previous selections manually.')
                                     );
                                 })() ? React.createElement('div', { className: 'space-y-2' },
                                     allSelections.map(entry => React.createElement('div', { key: entry.id }, 'Test'))
                                 )
                                 : React.createElement('div', { className: 'mb-4' },