// Header Component
function Header({ 
    liveDataAvailable, 
    currentJackpot, 
    nextDrawDate, 
    aiEnabled, 
    isUpdating, 
    onRefresh 
}) {
    const { useState, useEffect } = React;

    return React.createElement('div', { 
        className: liveDataAvailable ? 'gradient-bg' : 'gradient-bg-unavailable',
        style: {
            position: 'sticky', 
            top: 0, 
            zIndex: 50, 
            marginBottom: '1rem',
            borderRadius: '0.75rem', 
            padding: '1rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }
    },
        React.createElement('div', { 
            style: { 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                color: 'white' 
            } 
        },
            React.createElement('div', { 
                style: { 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem' 
                } 
            },
                React.createElement('div', { 
                    style: { 
                        background: 'rgba(255,255,255,0.2)', 
                        padding: '8px', 
                        borderRadius: '50%' 
                    } 
                },
                    liveDataAvailable ? '🎯' : '⚠️'
                ),
                React.createElement('div', null,
                    React.createElement('div', { 
                        style: { 
                            opacity: 0.8, 
                            fontSize: '0.75rem', 
                            fontWeight: 500 
                        } 
                    },
                        aiEnabled ? 'Claude AI + 6 Algorithms Hybrid' : 'Enhanced Powerball System'
                    ),
                    React.createElement('div', { 
                        style: { 
                            fontSize: '1.5rem', 
                            fontWeight: 700 
                        } 
                    },
                        liveDataAvailable && currentJackpot ? 
                            currentJackpot.formatted : 
                            'Visit powerball.com'
                    ),
                    React.createElement('div', { 
                        style: { 
                            opacity: 0.7, 
                            fontSize: '0.625rem' 
                        } 
                    },
                        (liveDataAvailable && currentJackpot ? 
                            `Cash: ${currentJackpot.cashFormatted} • ` : 
                            'For current jackpot • '),
                        nextDrawDate || 'Next drawing TBD'
                    )
                )
            ),
            React.createElement('div', { style: { textAlign: 'right' } },
                React.createElement('button', {
                    onClick: onRefresh,
                    disabled: isUpdating,
                    style: {
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: 'none',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.375rem',
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        opacity: isUpdating ? 0.7 : 1,
                        fontSize: '0.875rem'
                    }
                },
                    isUpdating ? 
                        React.createElement('span', { className: 'loading-spinner' }) : 
                        '🔄',
                    ' Refresh'
                )
            )
        )
    );
}

// Export component
window.Header = Header;