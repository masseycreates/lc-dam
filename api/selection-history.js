// Selection History API - Manages persistent storage across browsers
// Uses simple file-based storage for cross-browser persistence

import { promises as fs } from 'fs';
import path from 'path';

// Simple file-based storage directory
const STORAGE_DIR = '/tmp/lottery-selections';
const MAX_HISTORY_SIZE = 1000; // Maximum selections per user
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Ensure storage directory exists
async function ensureStorageDir() {
    try {
        await fs.mkdir(STORAGE_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to create storage directory:', error);
    }
}

// Generate user ID from browser fingerprint or create new one
function generateUserId(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    // Create a simple hash from browser characteristics
    const fingerprint = userAgent + acceptLanguage + acceptEncoding;
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return 'user_' + Math.abs(hash).toString(36);
}

// Get user's selection history file path
function getUserFilePath(userId) {
    return path.join(STORAGE_DIR, `${userId}.json`);
}

// Load user's selection history
async function loadUserHistory(userId) {
    try {
        const filePath = getUserFilePath(userId);
        const data = await fs.readFile(filePath, 'utf8');
        const history = JSON.parse(data);
        
        // Validate and clean up data
        if (!Array.isArray(history.selections)) {
            history.selections = [];
        }
        
        return history;
    } catch (error) {
        // Return empty history if file doesn't exist or is corrupted
        return {
            selections: [],
            lastUpdated: new Date().toISOString(),
            version: 1
        };
    }
}

// Save user's selection history
async function saveUserHistory(userId, history) {
    try {
        await ensureStorageDir();
        
        // Add metadata
        history.lastUpdated = new Date().toISOString();
        history.version = history.version || 1;
        
        // Limit history size
        if (history.selections.length > MAX_HISTORY_SIZE) {
            history.selections = history.selections.slice(-MAX_HISTORY_SIZE);
        }
        
        const filePath = getUserFilePath(userId);
        await fs.writeFile(filePath, JSON.stringify(history, null, 2));
        
        return true;
    } catch (error) {
        console.error('Failed to save user history:', error);
        return false;
    }
}

// Clean up old files
async function cleanupOldFiles() {
    try {
        const files = await fs.readdir(STORAGE_DIR);
        const now = Date.now();
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(STORAGE_DIR, file);
                const stats = await fs.stat(filePath);
                
                // Delete files older than 30 days
                if (now - stats.mtime.getTime() > 30 * 24 * 60 * 60 * 1000) {
                    await fs.unlink(filePath);
                    console.log('Cleaned up old file:', file);
                }
            }
        }
    } catch (error) {
        console.error('Cleanup failed:', error);
    }
}

// Set up periodic cleanup
setInterval(cleanupOldFiles, CLEANUP_INTERVAL);

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const userId = req.headers['x-user-id'] || generateUserId(req);
        
        switch (req.method) {
            case 'GET':
                // Get user's selection history
                const history = await loadUserHistory(userId);
                return res.status(200).json({
                    success: true,
                    data: history,
                    userId: userId
                });
                
            case 'POST':
                // Add new selection to history
                const { selection } = req.body;
                
                if (!selection || !selection.numbers || !selection.powerball) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid selection data'
                    });
                }
                
                const currentHistory = await loadUserHistory(userId);
                
                // Add new selection with metadata
                const newSelection = {
                    ...selection,
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toISOString(),
                    status: 'pending'
                };
                
                currentHistory.selections.push(newSelection);
                
                const saved = await saveUserHistory(userId, currentHistory);
                
                if (saved) {
                    return res.status(200).json({
                        success: true,
                        data: newSelection,
                        userId: userId
                    });
                } else {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to save selection'
                    });
                }
                
            case 'PUT':
                // Update existing selection (e.g., with results)
                const { selectionId, updates } = req.body;
                
                if (!selectionId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Selection ID required'
                    });
                }
                
                const historyToUpdate = await loadUserHistory(userId);
                const selectionIndex = historyToUpdate.selections.findIndex(s => s.id === selectionId);
                
                if (selectionIndex === -1) {
                    return res.status(404).json({
                        success: false,
                        error: 'Selection not found'
                    });
                }
                
                // Update selection
                historyToUpdate.selections[selectionIndex] = {
                    ...historyToUpdate.selections[selectionIndex],
                    ...updates,
                    lastUpdated: new Date().toISOString()
                };
                
                const updateSaved = await saveUserHistory(userId, historyToUpdate);
                
                if (updateSaved) {
                    return res.status(200).json({
                        success: true,
                        data: historyToUpdate.selections[selectionIndex]
                    });
                } else {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to update selection'
                    });
                }
                
            case 'DELETE':
                // Delete selection or clear history
                const { selectionId: deleteId, clearAll } = req.body;
                
                const historyToDelete = await loadUserHistory(userId);
                
                if (clearAll) {
                    // Clear all history
                    historyToDelete.selections = [];
                } else if (deleteId) {
                    // Delete specific selection
                    historyToDelete.selections = historyToDelete.selections.filter(s => s.id !== deleteId);
                } else {
                    return res.status(400).json({
                        success: false,
                        error: 'Either selectionId or clearAll required'
                    });
                }
                
                const deleteSaved = await saveUserHistory(userId, historyToDelete);
                
                if (deleteSaved) {
                    return res.status(200).json({
                        success: true,
                        data: historyToDelete
                    });
                } else {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to delete selection(s)'
                    });
                }
                
            default:
                return res.status(405).json({
                    success: false,
                    error: 'Method not allowed'
                });
        }
        
    } catch (error) {
        console.error('Selection history API error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}