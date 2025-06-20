// Quick Selection Component
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

    return React.createElement('div', { className: 'space-y-4' },
        // Data Selector
        React.createElement('div', { className: 'data-selector' },
            React.createElement('div', { className: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3' },
                React.createElement('div', null,
                    React.createElement('h4', { className: 'text-sm font-semibold text-gray-700' }, '📊 Historical Data Range