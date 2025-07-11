// Compact Selection History Component
// Displays selection history in a condensed format to handle large datasets efficiently

(() => {
    // Configuration
    const ITEMS_PER_PAGE = 20;
    const COMPACT_VIEW_THRESHOLD = 10; // Switch to compact view when more than this many items

    class CompactSelectionHistory {
        constructor() {
            this.currentPage = 1;
            this.viewMode = 'compact'; // 'compact' or 'detailed'
            this.groupBy = 'date'; // 'date', 'week', 'month'
            this.expandedGroups = new Set();
            this.expandedItems = new Set();
        }

        // Group selections by date/week/month
        groupSelections(selections, groupBy = 'date') {
            const groups = {};
            
            selections.forEach(selection => {
                const date = new Date(selection.dateSaved || selection.timestamp);
                let groupKey;
                
                switch (groupBy) {
                    case 'week':
                        const weekStart = new Date(date);
                        weekStart.setDate(date.getDate() - date.getDay());
                        groupKey = weekStart.toISOString().split('T')[0];
                        break;
                    case 'month':
                        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        break;
                    default: // 'date'
                        groupKey = date.toISOString().split('T')[0];
                }
                
                if (!groups[groupKey]) {
                    groups[groupKey] = [];
                }
                groups[groupKey].push(selection);
            });
            
            return groups;
        }

        // Format group header
        formatGroupHeader(groupKey, groupBy, count) {
            const date = new Date(groupKey);
            let label;
            
            switch (groupBy) {
                case 'week':
                    const weekEnd = new Date(date);
                    weekEnd.setDate(date.getDate() + 6);
                    label = `Week of ${date.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
                    break;
                case 'month':
                    label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                    break;
                default:
                    label = date.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
            }
            
            return `${label} (${count} selection${count !== 1 ? 's' : ''})`;
        }

        // Render compact selection item
        renderCompactItem(selection, index) {
            const isWin = selection.result === 'win';
            const isLoss = selection.result === 'loss';
            const isSaved = selection.type === 'saved';
            const isExpanded = this.expandedItems.has(selection.id);

            const statusIcon = isWin ? '🏆' : isLoss ? '❌' : '⏳';
            const typeIcon = isSaved ? '💾' : selection.claudeGenerated ? '🤖' : '📝';
            
            return React.createElement('div', {
                key: selection.id,
                className: `compact-selection-item ${isWin ? 'win' : isLoss ? 'loss' : 'pending'} ${isSaved ? 'saved' : ''}`,
                onClick: () => this.toggleItemExpansion(selection.id)
            },
                // Compact row
                React.createElement('div', { 
                    className: 'compact-row',
                    style: { 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0'
                    }
                },
                    // Index and icons
                    React.createElement('span', { 
                        className: 'item-index',
                        style: { width: '30px', color: '#666' }
                    }, `${index + 1}.`),
                    
                    React.createElement('span', { 
                        style: { width: '20px' }
                    }, typeIcon),
                    
                    React.createElement('span', { 
                        style: { width: '20px' }
                    }, statusIcon),
                    
                    // Numbers (ultra compact)
                    React.createElement('div', { 
                        className: 'numbers-compact',
                        style: { 
                            flex: 1, 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '4px',
                            minWidth: 0
                        }
                    },
                        React.createElement('span', {
                            style: { 
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                whiteSpace: 'nowrap'
                            }
                        }, (selection.numbers || []).join('-')),
                        
                        selection.powerball ? React.createElement('span', {
                            style: { 
                                color: '#dc2626',
                                fontWeight: 'bold',
                                fontSize: '11px'
                            }
                        }, `PB:${selection.powerball}`) : null
                    ),
                    
                    // Win amount (if any)
                    selection.winAmount > 0 ? React.createElement('span', {
                        style: { 
                            color: '#16a34a',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            marginLeft: '8px'
                        }
                    }, `$${selection.winAmount.toFixed(2)}`) : null,
                    
                    // Time
                    React.createElement('span', {
                        style: { 
                            color: '#666',
                            fontSize: '10px',
                            marginLeft: '8px',
                            width: '40px',
                            textAlign: 'right'
                        }
                    }, new Date(selection.dateSaved || selection.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })),
                    
                    // Expand indicator
                    React.createElement('span', {
                        style: { 
                            marginLeft: '8px',
                            color: '#666',
                            fontSize: '10px'
                        }
                    }, isExpanded ? '▼' : '▶')
                ),
                
                // Expanded details (if expanded)
                isExpanded ? React.createElement('div', {
                    className: 'expanded-details',
                    style: {
                        padding: '8px 16px',
                        backgroundColor: '#f9f9f9',
                        fontSize: '11px',
                        borderTop: '1px solid #e0e0e0'
                    }
                },
                    React.createElement('div', { style: { marginBottom: '4px' } },
                        React.createElement('strong', null, 'Strategy: '),
                        selection.strategy || selection.name || 'Manual Entry'
                    ),
                    
                    selection.confidence ? React.createElement('div', { style: { marginBottom: '4px' } },
                        React.createElement('strong', null, 'Confidence: '),
                        `${selection.confidence}%`
                    ) : null,
                    
                    selection.drawingInfo?.targetDrawingDate ? React.createElement('div', { style: { marginBottom: '4px' } },
                        React.createElement('strong', null, 'Target Drawing: '),
                        selection.drawingInfo.drawingDisplayDate || selection.drawingInfo.targetDrawingDate
                    ) : null,
                    
                    selection.notes ? React.createElement('div', { style: { marginBottom: '4px' } },
                        React.createElement('strong', null, 'Notes: '),
                        selection.notes
                    ) : null,
                    
                    React.createElement('div', { style: { display: 'flex', gap: '16px', color: '#666' } },
                        React.createElement('span', null, `Source: ${selection.source || 'Manual'}`),
                        selection.datePlayed ? React.createElement('span', null, 
                            `Played: ${new Date(selection.datePlayed).toLocaleDateString()}`
                        ) : null
                    )
                ) : null
            );
        }

        // Render group
        renderGroup(groupKey, selections, groupBy) {
            const isExpanded = this.expandedGroups.has(groupKey);
            const groupHeader = this.formatGroupHeader(groupKey, groupBy, selections.length);
            
            return React.createElement('div', {
                key: groupKey,
                className: 'selection-group',
                style: { marginBottom: '8px' }
            },
                // Group header
                React.createElement('div', {
                    className: 'group-header',
                    onClick: () => this.toggleGroupExpansion(groupKey),
                    style: {
                        padding: '8px 12px',
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }
                },
                    React.createElement('span', null, groupHeader),
                    React.createElement('span', {
                        style: { fontSize: '12px' }
                    }, isExpanded ? '▼' : '▶')
                ),
                
                // Group content
                isExpanded ? React.createElement('div', {
                    className: 'group-content',
                    style: {
                        border: '1px solid #ddd',
                        borderTop: 'none',
                        borderRadius: '0 0 4px 4px'
                    }
                },
                    selections.map((selection, index) => 
                        this.renderCompactItem(selection, index)
                    )
                ) : null
            );
        }

        // Toggle group expansion
        toggleGroupExpansion(groupKey) {
            if (this.expandedGroups.has(groupKey)) {
                this.expandedGroups.delete(groupKey);
            } else {
                this.expandedGroups.add(groupKey);
            }
            this.render();
        }

        // Toggle item expansion
        toggleItemExpansion(itemId) {
            if (this.expandedItems.has(itemId)) {
                this.expandedItems.delete(itemId);
            } else {
                this.expandedItems.add(itemId);
            }
            this.render();
        }

        // Render pagination controls
        renderPagination(totalItems) {
            const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
            if (totalPages <= 1) return null;

            return React.createElement('div', {
                className: 'pagination-controls',
                style: {
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px',
                    fontSize: '12px'
                }
            },
                React.createElement('button', {
                    onClick: () => this.changePage(this.currentPage - 1),
                    disabled: this.currentPage === 1,
                    style: {
                        padding: '4px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: this.currentPage === 1 ? '#f5f5f5' : 'white',
                        cursor: this.currentPage === 1 ? 'not-allowed' : 'pointer'
                    }
                }, '← Previous'),
                
                React.createElement('span', {
                    style: { margin: '0 16px' }
                }, `Page ${this.currentPage} of ${totalPages}`),
                
                React.createElement('button', {
                    onClick: () => this.changePage(this.currentPage + 1),
                    disabled: this.currentPage === totalPages,
                    style: {
                        padding: '4px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: this.currentPage === totalPages ? '#f5f5f5' : 'white',
                        cursor: this.currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }
                }, 'Next →')
            );
        }

        // Change page
        changePage(newPage) {
            this.currentPage = newPage;
            this.render();
        }

        // Render view controls
        renderControls() {
            return React.createElement('div', {
                className: 'view-controls',
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: '#f9f9f9',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    fontSize: '12px'
                }
            },
                React.createElement('div', { style: { display: 'flex', gap: '16px' } },
                    React.createElement('label', null,
                        'Group by: ',
                        React.createElement('select', {
                            value: this.groupBy,
                            onChange: (e) => {
                                this.groupBy = e.target.value;
                                this.render();
                            },
                            style: { fontSize: '12px', padding: '2px' }
                        },
                            React.createElement('option', { value: 'date' }, 'Date'),
                            React.createElement('option', { value: 'week' }, 'Week'),
                            React.createElement('option', { value: 'month' }, 'Month')
                        )
                    )
                ),
                
                React.createElement('div', { style: { display: 'flex', gap: '8px' } },
                    React.createElement('button', {
                        onClick: () => this.expandAllGroups(),
                        style: {
                            padding: '4px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                        }
                    }, 'Expand All'),
                    
                    React.createElement('button', {
                        onClick: () => this.collapseAllGroups(),
                        style: {
                            padding: '4px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                        }
                    }, 'Collapse All')
                )
            );
        }

        // Expand all groups
        expandAllGroups() {
            // Get all group keys from current data
            const allSelections = this.getAllSelections();
            const groups = this.groupSelections(allSelections, this.groupBy);
            Object.keys(groups).forEach(key => this.expandedGroups.add(key));
            this.render();
        }

        // Collapse all groups
        collapseAllGroups() {
            this.expandedGroups.clear();
            this.expandedItems.clear();
            this.render();
        }

        // Get all selections (this would be called from the main component)
        getAllSelections() {
            // This should be implemented by the parent component
            return window.getAllSelectionsForCompactView ? window.getAllSelectionsForCompactView() : [];
        }

        // Main render method
        render() {
            const allSelections = this.getAllSelections();
            
            if (allSelections.length === 0) {
                return React.createElement('div', {
                    style: {
                        textAlign: 'center',
                        padding: '32px',
                        color: '#666',
                        fontSize: '14px'
                    }
                }, 'No selections found');
            }

            const groups = this.groupSelections(allSelections, this.groupBy);
            const groupKeys = Object.keys(groups).sort().reverse(); // Most recent first
            
            // Pagination
            const startIndex = (this.currentPage - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;
            const paginatedGroupKeys = groupKeys.slice(startIndex, endIndex);

            return React.createElement('div', {
                className: 'compact-selection-history',
                style: {
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: 'white'
                }
            },
                this.renderControls(),
                
                paginatedGroupKeys.map(groupKey => 
                    this.renderGroup(groupKey, groups[groupKey], this.groupBy)
                ),
                
                this.renderPagination(groupKeys.length)
            );
        }
    }

    // Global instance
    window.compactSelectionHistory = new CompactSelectionHistory();

    // CSS styles
    const style = document.createElement('style');
    style.textContent = `
        .compact-selection-item {
            transition: background-color 0.2s;
        }
        
        .compact-selection-item:hover {
            background-color: #f9f9f9;
        }
        
        .compact-selection-item.win {
            border-left: 3px solid #16a34a;
        }
        
        .compact-selection-item.loss {
            border-left: 3px solid #dc2626;
        }
        
        .compact-selection-item.pending {
            border-left: 3px solid #eab308;
        }
        
        .compact-selection-item.saved {
            background-color: #eff6ff;
        }
        
        .group-header:hover {
            background-color: #e5e5e5;
        }
        
        .pagination-controls button:hover:not(:disabled) {
            background-color: #f0f0f0;
        }
    `;
    document.head.appendChild(style);

    // Helper function to integrate with existing code
    window.renderCompactSelectionHistory = function(selectionHistory, savedSelections) {
        // Set up data access for the compact view
        window.getAllSelectionsForCompactView = function() {
            const allSelections = [
                ...selectionHistory.map(entry => ({ ...entry, source: entry.source || 'Manual Entry', type: 'history' })),
                ...savedSelections.map(entry => ({ ...entry, source: entry.source || 'Saved Selection', type: 'saved' }))
            ];
            
            // Sort by timestamp (newest first)
            allSelections.sort((a, b) => {
                const dateA = new Date(a.dateSaved || a.timestamp || 0);
                const dateB = new Date(b.dateSaved || b.timestamp || 0);
                return dateB - dateA;
            });
            
            return allSelections;
        };
        
        return window.compactSelectionHistory.render();
    };
})();