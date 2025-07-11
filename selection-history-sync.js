// Selection History Sync Integration
// This script adds sync functionality to the existing selection history

(function() {
    'use strict';
    
    // Sync Manager Class
    class SelectionHistorySync {
        constructor() {
            this.autoSyncEnabled = localStorage.getItem('autoSyncEnabled') === 'true';
            this.lastSyncTime = localStorage.getItem('lastSyncTime');
            this.isOnline = navigator.onLine;
            this.syncInProgress = false;
            
            this.init();
        }
        
        init() {
            // Listen for online/offline events
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.updateConnectionStatus();
                if (this.autoSyncEnabled && !this.syncInProgress) {
                    this.syncNow();
                }
            });
            
            window.addEventListener('offline', () => {
                this.isOnline = false;
                this.updateConnectionStatus();
            });
            
            // Listen for storage changes to trigger auto-sync
            window.addEventListener('storage', (e) => {
                if ((e.key === 'powerball_selection_history' || e.key === 'powerball_saved_selections') 
                    && this.autoSyncEnabled && this.isOnline && !this.syncInProgress) {
                    this.debouncedSync();
                }
            });
            
            // Update UI on initialization
            this.updateConnectionStatus();
            this.updateLastSyncTime();
        }
        
        debouncedSync() {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = setTimeout(() => {
                this.syncNow();
            }, 2000);
        }
        
        async syncNow() {
            if (!this.isOnline || this.syncInProgress) {
                this.showStatus('❌ Cannot sync - ' + (!this.isOnline ? 'Offline' : 'Sync in progress'), 'error');
                return false;
            }
            
            this.syncInProgress = true;
            
            try {
                this.showStatus('⏳ Syncing selections...', 'info');
                
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
                            deviceId: this.getDeviceId(),
                            timestamp: new Date().toISOString()
                        }
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.lastSyncTime = new Date().toISOString();
                    localStorage.setItem('lastSyncTime', this.lastSyncTime);
                    this.showStatus('✅ Sync completed successfully', 'success');
                    this.updateLastSyncTime();
                    
                    // Mark selections as synced
                    this.markSelectionsSynced();
                    
                    return true;
                } else {
                    throw new Error(result.error || 'Sync failed');
                }
            } catch (error) {
                console.error('Sync error:', error);
                this.showStatus(`❌ Sync failed: ${error.message}`, 'error');
                return false;
            } finally {
                this.syncInProgress = false;
            }
        }
        
        async loadFromSync() {
            if (!this.isOnline || this.syncInProgress) {
                this.showStatus('❌ Cannot load - ' + (!this.isOnline ? 'Offline' : 'Sync in progress'), 'error');
                return false;
            }
            
            this.syncInProgress = true;
            
            try {
                this.showStatus('⏳ Loading from sync...', 'info');
                
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
                    
                    const totalLoaded = mergedSelections.length + mergedSavedSelections.length;
                    this.showStatus(`✅ Loaded ${totalLoaded} selections from sync`, 'success');
                    
                    // Trigger UI refresh
                    if (window.refreshSelectionHistory) {
                        window.refreshSelectionHistory();
                    } else {
                        // Fallback: reload page after a short delay
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    }
                    
                    return true;
                } else {
                    this.showStatus('ℹ️ No sync data available', 'info');
                    return false;
                }
            } catch (error) {
                console.error('Load sync error:', error);
                this.showStatus(`❌ Failed to load sync: ${error.message}`, 'error');
                return false;
            } finally {
                this.syncInProgress = false;
            }
        }
        
        mergeSelections(current, incoming) {
            const merged = [...current];
            const existingIds = new Set(current.map(s => s.id));
            
            for (const selection of incoming) {
                if (!existingIds.has(selection.id)) {
                    // Mark as synced when loading from sync
                    selection.syncedAt = new Date().toISOString();
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
        
        markSelectionsSynced() {
            const syncTime = new Date().toISOString();
            
            // Mark selection history as synced
            const selections = JSON.parse(localStorage.getItem('powerball_selection_history') || '[]');
            const updatedSelections = selections.map(s => ({ ...s, syncedAt: syncTime }));
            localStorage.setItem('powerball_selection_history', JSON.stringify(updatedSelections));
            
            // Mark saved selections as synced
            const savedSelections = JSON.parse(localStorage.getItem('powerball_saved_selections') || '[]');
            const updatedSavedSelections = savedSelections.map(s => ({ ...s, syncedAt: syncTime }));
            localStorage.setItem('powerball_saved_selections', JSON.stringify(updatedSavedSelections));
        }
        
        toggleAutoSync() {
            this.autoSyncEnabled = !this.autoSyncEnabled;
            localStorage.setItem('autoSyncEnabled', this.autoSyncEnabled.toString());
            
            this.updateAutoSyncUI();
            
            if (this.autoSyncEnabled) {
                this.showStatus('✅ Auto-sync enabled', 'success');
                // Trigger immediate sync if online
                if (this.isOnline && !this.syncInProgress) {
                    setTimeout(() => this.syncNow(), 1000);
                }
            } else {
                this.showStatus('ℹ️ Auto-sync disabled', 'info');
            }
        }
        
        getDeviceId() {
            let deviceId = localStorage.getItem('deviceId');
            if (!deviceId) {
                deviceId = 'device_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
                localStorage.setItem('deviceId', deviceId);
            }
            return deviceId;
        }
        
        showStatus(message, type) {
            console.log(`[Sync] ${message}`);
            
            // Try to update UI status element
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
            
            // Also show in console for debugging
            if (type === 'error') {
                console.error(message);
            } else if (type === 'success') {
                console.log('✅', message);
            } else {
                console.info('ℹ️', message);
            }
        }
        
        updateConnectionStatus() {
            const statusEl = document.getElementById('syncConnectionStatus');
            if (statusEl) {
                statusEl.textContent = this.isOnline ? '🟢 Online' : '🔴 Offline';
                statusEl.className = this.isOnline ? 'text-green-600 font-medium' : 'text-red-600 font-medium';
            }
        }
        
        updateLastSyncTime() {
            const lastSyncEl = document.getElementById('lastSyncTime');
            if (lastSyncEl) {
                if (this.lastSyncTime) {
                    const date = new Date(this.lastSyncTime);
                    lastSyncEl.textContent = date.toLocaleString();
                } else {
                    lastSyncEl.textContent = 'Never';
                }
            }
        }
        
        updateAutoSyncUI() {
            const toggleEl = document.getElementById('autoSyncToggle');
            const statusEl = document.getElementById('autoSyncStatus');
            
            if (toggleEl) {
                if (this.autoSyncEnabled) {
                    toggleEl.classList.add('active');
                } else {
                    toggleEl.classList.remove('active');
                }
            }
            
            if (statusEl) {
                statusEl.textContent = this.autoSyncEnabled ? 'Enabled' : 'Disabled';
                statusEl.className = this.autoSyncEnabled ? 'text-green-600 font-medium' : 'text-gray-600';
            }
        }
        
        // Public API methods
        getSyncStats() {
            const selections = JSON.parse(localStorage.getItem('powerball_selection_history') || '[]');
            const savedSelections = JSON.parse(localStorage.getItem('powerball_saved_selections') || '[]');
            const syncedSelections = [...selections, ...savedSelections].filter(s => s.syncedAt);
            
            return {
                totalSelections: selections.length + savedSelections.length,
                syncedSelections: syncedSelections.length,
                lastSyncTime: this.lastSyncTime,
                autoSyncEnabled: this.autoSyncEnabled,
                isOnline: this.isOnline
            };
        }
    }
    
    // Initialize sync manager
    if (!window.selectionHistorySync) {
        window.selectionHistorySync = new SelectionHistorySync();
        
        // Make methods globally available
        window.syncSelectionHistory = () => window.selectionHistorySync.syncNow();
        window.loadFromSyncHistory = () => window.selectionHistorySync.loadFromSync();
        window.toggleAutoSyncHistory = () => window.selectionHistorySync.toggleAutoSync();
        window.getSyncStats = () => window.selectionHistorySync.getSyncStats();
        
        console.log('✅ Selection History Sync initialized');
        console.log('📊 Sync Stats:', window.selectionHistorySync.getSyncStats());
    }
    
    // Add sync controls to existing selection history if not already present
    function addSyncControls() {
        const historyContainer = document.querySelector('[data-tab="history"]');
        if (historyContainer && !document.getElementById('syncControls')) {
            const syncControlsHTML = `
                <div id="syncControls" class="card bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 mb-4">
                    <div class="flex items-center justify-between mb-4">
                        <h4 class="text-md font-semibold text-gray-900">☁️ Sync Controls</h4>
                        <div class="flex items-center gap-3">
                            <span id="syncConnectionStatus" class="text-sm font-medium">🔴 Offline</span>
                            <a href="sync-manager.html" class="btn btn-secondary btn-sm">⚙️ Sync Manager</a>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-3 mb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-sm">Auto-sync:</span>
                            <button id="autoSyncToggle" class="toggle-switch" onclick="window.toggleAutoSyncHistory()"></button>
                            <span id="autoSyncStatus" class="text-gray-600">Disabled</span>
                        </div>
                        <button onclick="window.syncSelectionHistory()" class="btn btn-primary btn-sm" id="syncNowBtn">🔄 Sync Now</button>
                        <button onclick="window.loadFromSyncHistory()" class="btn btn-secondary btn-sm" id="loadSyncBtn">📥 Load from Sync</button>
                    </div>
                    
                    <div class="flex items-center justify-between text-sm text-gray-600">
                        <div id="syncStatus" class="sync-status"></div>
                        <div>Last sync: <span id="lastSyncTime">Never</span></div>
                    </div>
                </div>
            `;
            
            historyContainer.insertAdjacentHTML('afterbegin', syncControlsHTML);
            
            // Update UI elements
            window.selectionHistorySync.updateConnectionStatus();
            window.selectionHistorySync.updateLastSyncTime();
            window.selectionHistorySync.updateAutoSyncUI();
        }
    }
    
    // Try to add sync controls when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addSyncControls);
    } else {
        addSyncControls();
    }
    
    // Also try to add controls when tab changes (for React-based tabs)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                addSyncControls();
            }
        });
    });
    
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
})();