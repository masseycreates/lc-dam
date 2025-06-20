// Data Analysis Component
function DataAnalysis({
    liveDataAvailable,
    historicalDataAvailable,
    historicalStats,
    lastUpdated,
    systemPerformance,
    aiEnabled
}) {
    const { useState } = React;

    return React.createElement('div', { className: 'space-y-6' },
        React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, '📊 Data Analysis & Statistics'),
            
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4' },
                React.createElement('div', { className: 'p-3 bg-gray-50 rounded-lg' },
                    React.createElement('h4', { className: 'font-medium text-sm mb-1' }, 'Live Data Status'),
                    React.createElement('p', { className: 'text-xs' }, liveDataAvailable ? '✅ Connected' : '❌ Unavailable'),
                    React.createElement('p', { className: 'text-xs text-gray-600' }, lastUpdated ? `Updated: ${lastUpdated}` : 'Not updated')
                ),
                React.createElement('div', { className: 'p-3 bg-gray-50 rounded-lg' },
                    React.createElement('h4', { className: 'font-medium text-sm mb-1' }, 'Historical Data'),
                    React.createElement('p', { className: 'text-xs' }, historicalDataAvailable ? '✅ Available' : '❌ Limited'),
                    React.createElement('p', { className: 'text-xs text-gray-600' }, 
                        historicalStats ? `${historicalStats.totalDrawings} drawings` : 'No data'
                    )
                )
            ),

            historicalStats && historicalStats.hotNumbers ? React.createElement('div', { className: 'space-y-4' },
                React.createElement('div', null,
                    React.createElement('h4', { className: 'font-medium text-sm mb-2' }, '🔥 Hot Numbers (Most Frequent)'),
                    React.createElement('div', { className: 'flex flex-wrap gap-2' },
                        historicalStats.hotNumbers.slice(0, 15).map(num =>
                            React.createElement('span', { 
                                key: num, 
                                className: 'px-2 py-1 bg-red-100 text-red-800 rounded text-xs'
                            }, num)
                        )
                    )
                ),
                React.createElement('div', null,
                    React.createElement('h4', { className: 'font-medium text-sm mb-2' }, '❄️ Cold Numbers (Least Frequent)'),
                    React.createElement('div', { className: 'flex flex-wrap gap-2' },
                        historicalStats.coldNumbers ? historicalStats.coldNumbers.slice(0, 15).map(num =>
                            React.createElement('span', { 
                                key: num, 
                                className: 'px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs'
                            }, num)
                        ) : React.createElement('span', { className: 'text-gray-500 text-xs' }, 'Data not available')
                    )
                )
            ) : React.createElement('p', { className: 'text-gray-500 text-sm' }, 'Statistical analysis will appear here when historical data is loaded.')
        ),

        // Data Quality Metrics
        historicalStats && historicalStats.qualityMetrics ? React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, '📈 Data Quality Metrics'),
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
                React.createElement('div', { className: 'text-center p-3 bg-gray-50 rounded-lg' },
                    React.createElement('div', { className: 'text-2xl font-bold text-blue-600' }, 
                        historicalStats.qualityMetrics.dataCompleteness
                    ),
                    React.createElement('div', { className: 'text-xs text-gray-600' }, 'Data Completeness')
                ),
                React.createElement('div', { className: 'text-center p-3 bg-gray-50 rounded-lg' },
                    React.createElement('div', { className: 'text-2xl font-bold text-green-600' }, 
                        historicalStats.qualityMetrics.recentCoverage
                    ),
                    React.createElement('div', { className: 'text-xs text-gray-600' }, 'Recent Coverage')
                ),
                React.createElement('div', { className: 'text-center p-3 bg-gray-50 rounded-lg' },
                    React.createElement('div', { className: 'text-2xl font-bold text-purple-600' }, 
                        historicalStats.qualityMetrics.historicalDepth
                    ),
                    React.createElement('div', { className: 'text-xs text-gray-600' }, 'Historical Depth')
                )
            )
        ) : null,

        // System Performance
        systemPerformance ? React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, '⚙️ System Performance'),
            React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
                React.createElement('div', { className: 'text-center' },
                    React.createElement('div', { className: 'text-2xl font-bold text-blue-600' }, systemPerformance.averageHitRate + '%'),
                    React.createElement('div', { className: 'text-xs text-gray-600' }, 'Avg Hit Rate')
                ),
                React.createElement('div', { className: 'text-center' },
                    React.createElement('div', { className: 'text-2xl font-bold text-green-600' }, systemPerformance.predictionsGenerated),
                    React.createElement('div', { className: 'text-xs text-gray-600' }, 'Predictions')
                ),
                React.createElement('div', { className: 'text-center' },
                    React.createElement('div', { className: 'text-2xl font-bold text-purple-600' }, aiEnabled ? 'HYBRID' : 'LOCAL'),
                    React.createElement('div', { className: 'text-xs text-gray-600' }, 'Mode')
                ),
                React.createElement('div', { className: 'text-center' },
                    React.createElement('div', { className: 'text-2xl font-bold text-orange-600' }, systemPerformance.status.toUpperCase()),
                    React.createElement('div', { className: 'text-xs text-gray-600' }, 'Status')
                )
            )
        ) : null,

        // Number Frequency Analysis
        historicalStats && historicalStats.numberFrequency ? React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, '📊 Detailed Frequency Analysis'),
            React.createElement('div', { className: 'space-y-4' },
                React.createElement('div', null,
                    React.createElement('h4', { className: 'font-medium text-sm mb-2' }, 'Top 10 Most Frequent Numbers'),
                    React.createElement('div', { className: 'grid grid-cols-5 md:grid-cols-10 gap-2' },
                        Object.entries(historicalStats.numberFrequency)
                            .sort((a, b) => (b[1].total || 0) - (a[1].total || 0))
                            .slice(0, 10)
                            .map(([num, freq]) =>
                                React.createElement('div', { 
                                    key: num,
                                    className: 'text-center p-2 bg-red-50 border border-red-200 rounded'
                                },
                                    React.createElement('div', { className: 'font-bold text-sm' }, num),
                                    React.createElement('div', { className: 'text-xs text-gray-600' }, freq.total || 0)
                                )
                            )
                    )
                ),
                React.createElement('div', null,
                    React.createElement('h4', { className: 'font-medium text-sm mb-2' }, 'Top 10 Least Frequent Numbers'),
                    React.createElement('div', { className: 'grid grid-cols-5 md:grid-cols-10 gap-2' },
                        Object.entries(historicalStats.numberFrequency)
                            .sort((a, b) => (a[1].total || 0) - (b[1].total || 0))
                            .slice(0, 10)
                            .map(([num, freq]) =>
                                React.createElement('div', { 
                                    key: num,
                                    className: 'text-center p-2 bg-blue-50 border border-blue-200 rounded'
                                },
                                    React.createElement('div', { className: 'font-bold text-sm' }, num),
                                    React.createElement('div', { className: 'text-xs text-gray-600' }, freq.total || 0)
                                )
                            )
                    )
                )
            )
        ) : null,

        // Powerball Analysis
        historicalStats && historicalStats.hotPowerballs ? React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, '🔴 Powerball Analysis'),
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                React.createElement('div', null,
                    React.createElement('h4', { className: 'font-medium text-sm mb-2' }, 'Hot Powerballs'),
                    React.createElement('div', { className: 'flex flex-wrap gap-2' },
                        historicalStats.hotPowerballs.map(num =>
                            React.createElement('span', { 
                                key: num, 
                                className: 'px-2 py-1 bg-red-500 text-white rounded text-xs font-medium'
                            }, num)
                        )
                    )
                ),
                React.createElement('div', null,
                    React.createElement('h4', { className: 'font-medium text-sm mb-2' }, 'Cold Powerballs'),
                    React.createElement('div', { className: 'flex flex-wrap gap-2' },
                        historicalStats.coldPowerballs ? historicalStats.coldPowerballs.map(num =>
                            React.createElement('span', { 
                                key: num, 
                                className: 'px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium'
                            }, num)
                        ) : React.createElement('span', { className: 'text-gray-500 text-xs' }, 'Data not available')
                    )
                )
            )
        ) : null,

        // Data Sources
        React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, '🌐 Data Sources'),
            React.createElement('div', { className: 'space-y-3 text-sm' },
                React.createElement('div', { className: 'flex items-center justify-between' },
                    React.createElement('span', null, 'Live Jackpot Data'),
                    React.createElement('span', { 
                        className: liveDataAvailable ? 'text-green-600' : 'text-red-600'
                    }, liveDataAvailable ? '✅ Connected' : '❌ Offline')
                ),
                React.createElement('div', { className: 'flex items-center justify-between' },
                    React.createElement('span', null, 'Historical Drawing Data'),
                    React.createElement('span', { 
                        className: historicalDataAvailable ? 'text-green-600' : 'text-orange-600'
                    }, historicalDataAvailable ? '✅ Live API' : '⚠️ Fallback')
                ),
                React.createElement('div', { className: 'flex items-center justify-between' },
                    React.createElement('span', null, 'Claude AI Integration'),
                    React.createElement('span', { 
                        className: aiEnabled ? 'text-purple-600' : 'text-gray-600'
                    }, aiEnabled ? '🤖 Active' : '⭕ Disabled')
                ),
                React.createElement('div', { className: 'text-xs text-gray-500 mt-4' },
                    'Data sources include NY State Open Data Portal, official lottery websites, and verified APIs. ',
                    'All data is used for educational and analysis purposes only.'
                )
            )
        )
    );
}

// Export component
window.DataAnalysis = DataAnalysis;