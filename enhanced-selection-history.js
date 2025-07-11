// Enhanced Selection History with Sync Manager Integration
// This component combines selection history display with sync functionality

(() => {
    // Sync Manager Integration Class
    class SelectionHistorySync {
        constructor() {
            this.autoSyncEnabled = localStorage.getItem('autoSyncEnabled') === 'true';
            this.lastSyncTime = localStorage.getItem('lastSyncTime');
            this.syncInterval = null;
            this.isOnline = navigator.onLine;
            
            // Listen for online/offline events
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.updateSyncStatus();
                if (this.autoSyncEnabled) {
                    this.syncNow();
                }
            });
            
            window.addEventListener('offline', () => {
                this.isOnline = false;
                this.updateSyncStatus();
            });
        }
        
        async syncNow() {
            if (!this.isOnline) {
                this.showSyncStatus('❌ Offline - Cannot sync', 'error');
                return false;
            }
            
            try {
                this.showSyncStatus('⏳ Syncing selections...', 'info');
                
                const selections = JSON.parse(localStorage.getItem('powerball_selection_history') || '[]');
                const savedSelections = JSON.parse(localStorage.getItem('powerball_saved_selections') || '[]');
                
                const response = await fetch('/api/selection-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        selections,
                        savedSelections,
                        metadata: {
                            userAgent: navigator.userAgent,
                            source: 'auto-sync',
                            deviceId: this.getDeviceId()
                        }
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.lastSyncTime = new Date().toISOString();
                    localStorage.setItem('lastSyncTime', this.lastSyncTime);
                    this.showSyncStatus('✅ Sync completed successfully', 'success');
                    this.updateSyncStatus();
                    return true;
                } else {
                    throw new Error(result.error || 'Sync failed');
                }
            } catch (error) {
                console.error('Sync error:', error);
                this.showSyncStatus(`❌ Sync failed: ${error.message}`, 'error');
                return false;
            }
        }
        
        async loadFromSync() {
            if (!this.isOnline) {
                this.showSyncStatus('❌ Offline - Cannot load sync data', 'error');
                return false;
            }
            
            try {
                this.showSyncStatus('⏳ Loading from sync...', 'info');
                
                const response = await fetch('/api/selection-sync');
                const result = await response.json();
                
                if (result.success && result.data) {
                    // Get current data
                    const currentSelections = JSON.parse(localStorage.getItem('powerball_selection_history') || '[]');
                    const currentSavedSelections = JSON.parse(localStorage.getItem('powerball_saved_selections') || '[]');
                    
                    // Merge data (avoid duplicates)
                    const mergedSelections = this.mergeSelections(currentSelections, result.data.selections || []);
                    const mergedSavedSelections = this.mergeSelections(currentSavedSelections, result.data.savedSelections || []);
                    
                    // Save merged data
                    localStorage.setItem('powerball_selection_history', JSON.stringify(mergedSelections));
                    localStorage.setItem('powerball_saved_selections', JSON.stringify(mergedSavedSelections));
                    
                    this.showSyncStatus(`✅ Loaded ${mergedSelections.length + mergedSavedSelections.length} selections from sync`, 'success');
                    
                    // Trigger UI refresh
                    if (window.refreshSelectionHistory) {
                        window.refreshSelectionHistory();
                    }
                    
                    return true;
                } else {
                    this.showSyncStatus('ℹ️ No sync data available', 'info');
                    return false;
                }
            } catch (error) {
                console.error('Load sync error:', error);
                this.showSyncStatus(`❌ Failed to load sync: ${error.message}`, 'error');
                return false;
            }
        }
        
        mergeSelections(current, incoming) {
            const merged = [...current];
            const existingIds = new Set(current.map(s => s.id));
            
            for (const selection of incoming) {
                if (!existingIds.has(selection.id)) {
                    merged.push(selection);
                    existingIds.add(selection.id);
                }
            }
            
            return merged.sort((a, b) => {
                const dateA = new Date(a.dateSaved || a.timestamp || 0);
                const dateB = new Date(b.dateSaved || b.timestamp || 0);
                return dateB - dateA;
            });
        }
        
        getDeviceId() {
            let deviceId = localStorage.getItem('deviceId');
            if (!deviceId) {
                deviceId = 'device_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
                localStorage.setItem('deviceId', deviceId);
            }
            return deviceId;
        }
        
        showSyncStatus(message, type) {
            const statusEl = document.getElementById('syncStatus');
            if (statusEl) {
                statusEl.textContent = message;
                statusEl.className = `sync-status ${type}`;
                
                // Auto-clear after 5 seconds
                setTimeout(() => {
                    if (statusEl.textContent === message) {
                        statusEl.textContent = '';
                        statusEl.className = 'sync-status';
                    }
                }, 5000);
            }
        }
        
        updateSyncStatus() {
            const statusEl = document.getElementById('syncConnectionStatus');
            if (statusEl) {
                statusEl.textContent = this.isOnline ? '🟢 Online' : '🔴 Offline';
                statusEl.className = this.isOnline ? 'text-green-600' : 'text-red-600';
            }
            
            const lastSyncEl = document.getElementById('lastSyncTime');
            if (lastSyncEl && this.lastSyncTime) {
                const date = new Date(this.lastSyncTime);
                lastSyncEl.textContent = date.toLocaleString();
            }
        }
        
        toggleAutoSync() {
            this.autoSyncEnabled = !this.autoSyncEnabled;
            localStorage.setItem('autoSyncEnabled', this.autoSyncEnabled.toString());
            
            const toggleEl = document.getElementById('autoSyncToggle');
            const statusEl = document.getElementById('autoSyncStatus');
            
            if (toggleEl && statusEl) {
                if (this.autoSyncEnabled) {
                    toggleEl.classList.add('active');
                    statusEl.textContent = 'Enabled';
                    statusEl.className = 'text-green-600 font-medium';
                    this.showSyncStatus('✅ Auto-sync enabled', 'success');
                } else {
                    toggleEl.classList.remove('active');
                    statusEl.textContent = 'Disabled';
                    statusEl.className = 'text-gray-600';
                    this.showSyncStatus('ℹ️ Auto-sync disabled', 'info');
                }
            }
        }
    }
    
    // Initialize sync manager
    const syncManager = new SelectionHistorySync();
    
    // Make sync functions globally available
    window.selectionHistorySync = syncManager;
    window.syncSelectionHistory = () => syncManager.syncNow();
    window.loadFromSyncHistory = () => syncManager.loadFromSync();
    window.toggleAutoSyncHistory = () => syncManager.toggleAutoSync();
    
    // Auto-sync on data changes (debounced)
    let autoSyncTimeout;
    const triggerAutoSync = () => {
        if (syncManager.autoSyncEnabled && syncManager.isOnline) {
            clearTimeout(autoSyncTimeout);
            autoSyncTimeout = setTimeout(() => {
                syncManager.syncNow();
            }, 2000); // Wait 2 seconds after last change
        }
    };
    
    // Listen for storage changes to trigger auto-sync
    window.addEventListener('storage', (e) => {
        if (e.key === 'powerball_selection_history' || e.key === 'powerball_saved_selections') {
            triggerAutoSync();
        }
    });
    
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

    // Main component render
    return React.createElement('div', { className: 'space-y-4' },
        // Sync Controls Header
        React.createElement('div', { className: 'card bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200' },
            React.createElement('div', { className: 'flex items-center justify-between mb-4' },
                React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, '📋 Selection History with Sync'),
                React.createElement('div', { className: 'flex items-center gap-3' },
                    React.createElement('span', { id: 'syncConnectionStatus', className: 'text-sm font-medium' }, 
                        syncManager.isOnline ? '🟢 Online' : '🔴 Offline'
                    ),
                    React.createElement('button', {
                        onClick: () => window.location.href = 'sync-manager.html',
                        className: 'btn btn-secondary btn-sm'
                    }, '⚙️ Sync Manager')
                )
            ),
            
            // Sync Controls
            React.createElement('div', { className: 'flex flex-wrap items-center gap-3 mb-3' },
                React.createElement('div', { className: 'flex items-center gap-2' },
                    React.createElement('span', { className: 'text-sm' }, 'Auto-sync:'),
                    React.createElement('button', {
                        id: 'autoSyncToggle',
                        onClick: () => syncManager.toggleAutoSync(),
                        className: `toggle-switch ${syncManager.autoSyncEnabled ? 'active' : ''}`,
                        style: {
                            width: '40px',
                            height: '20px',
                            borderRadius: '10px',
                            border: '2px solid #ccc',
                            backgroundColor: syncManager.autoSyncEnabled ? '#4CAF50' : '#ccc',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }
                    }),
                    React.createElement('span', { 
                        id: 'autoSyncStatus',
                        className: syncManager.autoSyncEnabled ? 'text-green-600 font-medium' : 'text-gray-600'
                    }, syncManager.autoSyncEnabled ? 'Enabled' : 'Disabled')
                ),
                React.createElement('button', {
                    onClick: () => syncManager.syncNow(),
                    className: 'btn btn-primary btn-sm',
                    disabled: !syncManager.isOnline
                }, '🔄 Sync Now'),
                React.createElement('button', {
                    onClick: () => syncManager.loadFromSync(),
                    className: 'btn btn-secondary btn-sm',
                    disabled: !syncManager.isOnline
                }, '📥 Load from Sync')
            ),
            
            // Sync Status and Info
            React.createElement('div', { className: 'flex items-center justify-between text-sm text-gray-600' },
                React.createElement('div', { id: 'syncStatus', className: 'sync-status' }),
                React.createElement('div', null,
                    'Last sync: ',
                    React.createElement('span', { id: 'lastSyncTime' }, 
                        syncManager.lastSyncTime ? new Date(syncManager.lastSyncTime).toLocaleString() : 'Never'
                    )
                )
            )
        ),

        // Selection History List
        allSelections.length > 0 ? React.createElement('div', { className: 'space-y-3' },
            ...allSelections.map(entry => {
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
                                entry.syncedAt ? React.createElement('span', {
                                    className: 'px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium'
                                }, '☁️ Synced') : null,
                                entry.generationType ? React.createElement('span', {
                                    className: 'px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium'
                                }, entry.generationType) : null
                            ),
                            React.createElement('p', { className: 'text-sm text-gray-600' },
                                entry.source + (entry.confidence ? ` • ${entry.confidence}% confidence` : '')
                            ),
                            // Drawing association info
                            entry.drawingInfo?.targetDrawingDate ? React.createElement('p', { className: 'text-xs text-blue-600 mt-1' },
                                `🎯 Target: ${entry.drawingInfo.drawingDisplayDate || entry.drawingInfo.targetDrawingDate} (${entry.drawingInfo.drawingDay})`
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
                                            triggerAutoSync(); // Trigger auto-sync after update
                                        }
                                    } else {
                                        updateSelectionResult(entry.id, newResult, 0, entry.type);
                                        triggerAutoSync(); // Trigger auto-sync after update
                                    }
                                },
                                className: 'text-xs px-2 py-1 border rounded'
                            },
                                React.createElement('option', { value: 'pending' }, 'Pending'),
                                React.createElement('option', { value: 'win' }, 'Win'),
                                React.createElement('option', { value: 'loss' }, 'Loss')
                            ),
                            React.createElement('button', {
                                onClick: () => {
                                    deleteSelectionEntry(entry.id, entry.type);
                                    triggerAutoSync(); // Trigger auto-sync after deletion
                                },
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
                            entry.checkedAt ? React.createElement('span', { className: 'ml-3' }, 'Checked: ' + new Date(entry.checkedAt).toLocaleDateString()) : null,
                            entry.syncedAt ? React.createElement('span', { className: 'ml-3 text-indigo-600' }, 'Synced: ' + new Date(entry.syncedAt).toLocaleDateString()) : null
                        ),
                        entry.winAmount > 0 ? React.createElement('span', { className: 'font-medium text-green-600' }, '$' + entry.winAmount.toFixed(2)) : null
                    ),

                    entry.notes ? React.createElement('p', { className: 'text-xs text-gray-600 mt-2' }, entry.notes) : null
                );
            })
        ) : React.createElement('div', { className: 'card' },
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
                            triggerAutoSync(); // Sync after checking results
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

            allSelections.length === 0 ? React.createElement('div', { className: 'text-center py-6 text-gray-500' },
                React.createElement('p', null, 'No selections saved yet.'),
                React.createElement('p', { className: 'text-sm mt-2' }, 'Save selections from the AI Hybrid tab or add previous selections manually.'),
                React.createElement('div', { className: 'mt-4' },
                    React.createElement('button', {
                        onClick: () => syncManager.loadFromSync(),
                        className: 'btn btn-primary btn-sm',
                        disabled: !syncManager.isOnline
                    }, '📥 Try Loading from Sync')
                )
            ) : null
        )
    );
})()