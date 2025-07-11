// Selection Sync API - Automatic file-based synchronization for cross-device persistence
// Provides downloadable backup files and sync capabilities

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Storage configuration
const STORAGE_DIR = process.env.VERCEL ?
    path.join(os.tmpdir(), 'lottery-sync') :
    path.resolve('./data/lottery-sync');

const SYNC_FILE_PREFIX = 'powerball_sync_';
const MAX_SYNC_FILES = 10; // Keep last 10 sync files per user
const SYNC_VERSION = '1.0';

console.log('Selection Sync API - Storage directory:', STORAGE_DIR);

// Ensure storage directory exists
async function ensureStorageDir() {
    try {
        await fs.mkdir(STORAGE_DIR, { recursive: true });
        console.log('Selection Sync API - Storage directory ready');
    } catch (error) {
        console.error('Failed to create sync storage directory:', error);
    }
}

// Generate user ID from browser fingerprint
function generateUserId(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    const fingerprint = userAgent + acceptLanguage + acceptEncoding;
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return 'user_' + Math.abs(hash).toString(36);
}

// Create sync file data structure
function createSyncData(selections, savedSelections, metadata = {}) {
    return {
        version: SYNC_VERSION,
        timestamp: new Date().toISOString(),
        deviceId: metadata.deviceId || 'unknown',
        syncId: generateSyncId(),
        data: {
            selections: selections || [],
            savedSelections: savedSelections || [],
            totalCount: (selections?.length || 0) + (savedSelections?.length || 0)
        },
        metadata: {
            userAgent: metadata.userAgent || '',
            lastModified: metadata.lastModified || new Date().toISOString(),
            source: metadata.source || 'manual',
            ...metadata
        }
    };
}

// Generate unique sync ID
function generateSyncId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get sync file path
function getSyncFilePath(userId, syncId = null) {
    const filename = syncId ? 
        `${SYNC_FILE_PREFIX}${userId}_${syncId}.json` :
        `${SYNC_FILE_PREFIX}${userId}_latest.json`;
    return path.join(STORAGE_DIR, filename);
}

// Save sync file
async function saveSyncFile(userId, selections, savedSelections, metadata = {}) {
    try {
        await ensureStorageDir();
        
        const syncData = createSyncData(selections, savedSelections, metadata);
        const filePath = getSyncFilePath(userId, syncData.syncId);
        
        // Save the sync file
        await fs.writeFile(filePath, JSON.stringify(syncData, null, 2));
        
        // Also update the latest file
        const latestPath = getSyncFilePath(userId);
        await fs.writeFile(latestPath, JSON.stringify(syncData, null, 2));
        
        // Clean up old sync files
        await cleanupOldSyncFiles(userId);
        
        console.log('Selection Sync API - Sync file saved:', filePath);
        
        return {
            success: true,
            syncId: syncData.syncId,
            timestamp: syncData.timestamp,
            filePath: filePath,
            dataCount: syncData.data.totalCount
        };
    } catch (error) {
        console.error('Selection Sync API - Error saving sync file:', error);
        throw error;
    }
}

// Load sync file
async function loadSyncFile(userId, syncId = null) {
    try {
        const filePath = getSyncFilePath(userId, syncId);
        const data = await fs.readFile(filePath, 'utf8');
        const syncData = JSON.parse(data);
        
        console.log('Selection Sync API - Sync file loaded:', filePath);
        
        return {
            success: true,
            data: syncData
        };
    } catch (error) {
        console.log('Selection Sync API - Sync file not found or error:', error.message);
        return {
            success: false,
            error: 'Sync file not found',
            data: null
        };
    }
}

// List available sync files for user
async function listSyncFiles(userId) {
    try {
        await ensureStorageDir();
        const files = await fs.readdir(STORAGE_DIR);
        const userFiles = files
            .filter(file => file.startsWith(`${SYNC_FILE_PREFIX}${userId}_`))
            .filter(file => !file.endsWith('_latest.json'));
        
        const syncFiles = [];
        
        for (const file of userFiles) {
            try {
                const filePath = path.join(STORAGE_DIR, file);
                const stats = await fs.stat(filePath);
                const data = await fs.readFile(filePath, 'utf8');
                const syncData = JSON.parse(data);
                
                syncFiles.push({
                    filename: file,
                    syncId: syncData.syncId,
                    timestamp: syncData.timestamp,
                    size: stats.size,
                    dataCount: syncData.data.totalCount,
                    deviceId: syncData.deviceId,
                    source: syncData.metadata?.source || 'unknown'
                });
            } catch (error) {
                console.warn('Selection Sync API - Error reading sync file:', file, error.message);
            }
        }
        
        // Sort by timestamp (newest first)
        syncFiles.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return {
            success: true,
            files: syncFiles
        };
    } catch (error) {
        console.error('Selection Sync API - Error listing sync files:', error);
        return {
            success: false,
            error: error.message,
            files: []
        };
    }
}

// Clean up old sync files
async function cleanupOldSyncFiles(userId) {
    try {
        const fileList = await listSyncFiles(userId);
        if (fileList.success && fileList.files.length > MAX_SYNC_FILES) {
            const filesToDelete = fileList.files.slice(MAX_SYNC_FILES);
            
            for (const file of filesToDelete) {
                try {
                    const filePath = path.join(STORAGE_DIR, file.filename);
                    await fs.unlink(filePath);
                    console.log('Selection Sync API - Cleaned up old sync file:', file.filename);
                } catch (error) {
                    console.warn('Selection Sync API - Error deleting old sync file:', error.message);
                }
            }
        }
    } catch (error) {
        console.warn('Selection Sync API - Error during cleanup:', error.message);
    }
}

// Merge sync data (for handling conflicts)
function mergeSyncData(localData, remoteData) {
    const merged = {
        selections: [],
        savedSelections: []
    };
    
    // Create maps for deduplication
    const selectionMap = new Map();
    const savedSelectionMap = new Map();
    
    // Add local data
    if (localData.selections) {
        localData.selections.forEach(item => {
            selectionMap.set(item.id, item);
        });
    }
    
    if (localData.savedSelections) {
        localData.savedSelections.forEach(item => {
            savedSelectionMap.set(item.id, item);
        });
    }
    
    // Add remote data (newer timestamps win)
    if (remoteData.selections) {
        remoteData.selections.forEach(item => {
            const existing = selectionMap.get(item.id);
            if (!existing || new Date(item.dateSaved || item.timestamp) > new Date(existing.dateSaved || existing.timestamp)) {
                selectionMap.set(item.id, item);
            }
        });
    }
    
    if (remoteData.savedSelections) {
        remoteData.savedSelections.forEach(item => {
            const existing = savedSelectionMap.get(item.id);
            if (!existing || new Date(item.dateSaved || item.timestamp) > new Date(existing.dateSaved || existing.timestamp)) {
                savedSelectionMap.set(item.id, item);
            }
        });
    }
    
    // Convert maps back to arrays
    merged.selections = Array.from(selectionMap.values());
    merged.savedSelections = Array.from(savedSelectionMap.values());
    
    return merged;
}

// Main API handler
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const userId = generateUserId(req);
        console.log('Selection Sync API - Request:', req.method, 'User:', userId);
        
        switch (req.method) {
            case 'GET':
                // Get sync file or list files
                const { syncId, list } = req.query;
                
                if (list === 'true') {
                    const fileList = await listSyncFiles(userId);
                    return res.status(200).json(fileList);
                } else {
                    const result = await loadSyncFile(userId, syncId);
                    return res.status(result.success ? 200 : 404).json(result);
                }
                
            case 'POST':
                // Save sync file
                const { selections, savedSelections, metadata } = req.body;
                
                if (!selections && !savedSelections) {
                    return res.status(400).json({
                        success: false,
                        error: 'No selection data provided'
                    });
                }
                
                const saveResult = await saveSyncFile(userId, selections, savedSelections, {
                    ...metadata,
                    userAgent: req.headers['user-agent'],
                    source: 'api'
                });
                
                return res.status(200).json(saveResult);
                
            case 'PUT':
                // Merge and update sync file
                const { localData, remoteData } = req.body;
                
                if (!localData || !remoteData) {
                    return res.status(400).json({
                        success: false,
                        error: 'Both local and remote data required for merge'
                    });
                }
                
                const mergedData = mergeSyncData(localData, remoteData);
                const mergeResult = await saveSyncFile(userId, mergedData.selections, mergedData.savedSelections, {
                    source: 'merge',
                    userAgent: req.headers['user-agent']
                });
                
                return res.status(200).json({
                    ...mergeResult,
                    mergedData
                });
                
            default:
                return res.status(405).json({
                    success: false,
                    error: 'Method not allowed'
                });
        }
    } catch (error) {
        console.error('Selection Sync API - Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}