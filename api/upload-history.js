// Upload History API - Handle importing selection history from JSON files
// Processes exported selection history data and merges with existing data

import { promises as fs } from 'fs';
import path from 'path';
// Simple file-based storage directory - use absolute path for consistency
const STORAGE_DIR = process.env.VERCEL ? '/tmp/lottery-selections' : path.resolve('./data/lottery-selections');
console.log('Upload API - Storage directory configured as:', STORAGE_DIR, 'CWD:', process.cwd());
const MAX_HISTORY_SIZE = 1000; // Maximum selections per user
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max file size

// Ensure storage directory exists
async function ensureStorageDir() {
    try {
        console.log('Upload API - Ensuring storage directory exists:', STORAGE_DIR);
        await fs.mkdir(STORAGE_DIR, { recursive: true });
        console.log('Upload API - Storage directory created/verified');
    } catch (error) {
        console.error('Upload API - Failed to create storage directory:', error);
    }
}

// Generate user ID from browser fingerprint (same logic as selection-history.js)
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

// Get user's selection history file path
function getUserFilePath(userId) {
    const filePath = path.join(STORAGE_DIR, `${userId}.json`);
    console.log('Upload API - Generated file path for user', userId, ':', filePath);
    return filePath;
}

// Load existing user history
async function loadUserHistory(userId) {
    try {
        const filePath = getUserFilePath(userId);
        const data = await fs.readFile(filePath, 'utf8');
        const history = JSON.parse(data);
        
        // Validate and clean up data
        if (!Array.isArray(history.selections)) {
            history.selections = [];
        }
        if (!Array.isArray(history.savedSelections)) {
            history.savedSelections = [];
        }
        if (!history.analytics) {
            history.analytics = {
                totalSelections: 0,
                winningSelections: 0,
                averageConfidence: 0,
                preferredStrategies: {},
                numberFrequency: {},
                powerballFrequency: {},
                lastAnalysisUpdate: new Date().toISOString()
            };
        }
        
        return history;
    } catch (error) {
        // Return empty history if file doesn't exist
        return {
            selections: [],
            savedSelections: [],
            analytics: {
                totalSelections: 0,
                winningSelections: 0,
                averageConfidence: 0,
                preferredStrategies: {},
                numberFrequency: {},
                powerballFrequency: {},
                lastAnalysisUpdate: new Date().toISOString()
            },
            lastUpdated: new Date().toISOString(),
            version: 2
        };
    }
}

// Validate selection entry structure
function validateSelectionEntry(entry) {
    if (!entry || typeof entry !== 'object') return false;
    
    // Required fields
    if (!Array.isArray(entry.numbers) || entry.numbers.length !== 5) return false;
    if (!entry.powerball || isNaN(parseInt(entry.powerball))) return false;
    
    // Validate number ranges
    for (const num of entry.numbers) {
        if (isNaN(parseInt(num)) || num < 1 || num > 69) return false;
    }
    
    const pb = parseInt(entry.powerball);
    if (pb < 1 || pb > 26) return false;
    
    return true;
}

// Clean and normalize imported data
function cleanImportedData(importedData) {
    const cleaned = {
        selections: [],
        savedSelections: [],
        analytics: {
            totalSelections: 0,
            winningSelections: 0,
            averageConfidence: 0,
            preferredStrategies: {},
            numberFrequency: {},
            powerballFrequency: {},
            lastAnalysisUpdate: new Date().toISOString()
        }
    };
    
    // Handle different possible data structures
    let selectionsToProcess = [];
    
    if (Array.isArray(importedData)) {
        // Direct array of selections
        selectionsToProcess = importedData;
    } else if (importedData.selections && Array.isArray(importedData.selections)) {
        // Object with selections array
        selectionsToProcess = importedData.selections;
        if (importedData.savedSelections && Array.isArray(importedData.savedSelections)) {
            cleaned.savedSelections = importedData.savedSelections.filter(validateSelectionEntry);
        }
        if (importedData.analytics && typeof importedData.analytics === 'object') {
            cleaned.analytics = { ...cleaned.analytics, ...importedData.analytics };
        }
    }
    
    // Process and validate each selection
    for (const entry of selectionsToProcess) {
        if (validateSelectionEntry(entry)) {
            const cleanedEntry = {
                id: entry.id || Date.now() + Math.random(),
                numbers: entry.numbers.map(n => parseInt(n)).sort((a, b) => a - b),
                powerball: parseInt(entry.powerball),
                name: entry.name || 'Imported Selection',
                source: entry.source || 'Imported',
                dateSaved: entry.dateSaved || new Date().toISOString(),
                datePlayed: entry.datePlayed || null,
                result: entry.result || 'pending',
                winAmount: parseFloat(entry.winAmount) || 0,
                notes: entry.notes || '',
                confidence: parseFloat(entry.confidence) || 0,
                strategy: entry.strategy || 'Unknown'
            };
            
            cleaned.selections.push(cleanedEntry);
        }
    }
    
    return cleaned;
}

// Merge imported data with existing data
function mergeHistoryData(existingData, importedData) {
    const merged = { ...existingData };
    
    // Create a set of existing selection IDs to avoid duplicates
    const existingIds = new Set([
        ...existingData.selections.map(s => s.id),
        ...existingData.savedSelections.map(s => s.id)
    ]);
    
    // Add new selections that don't already exist
    let addedCount = 0;
    for (const selection of importedData.selections) {
        if (!existingIds.has(selection.id)) {
            merged.selections.push(selection);
            addedCount++;
        }
    }
    
    // Add new saved selections
    for (const selection of importedData.savedSelections) {
        if (!existingIds.has(selection.id)) {
            merged.savedSelections.push(selection);
            addedCount++;
        }
    }
    
    // Limit total selections to prevent excessive storage
    if (merged.selections.length > MAX_HISTORY_SIZE) {
        merged.selections = merged.selections.slice(-MAX_HISTORY_SIZE);
    }
    
    if (merged.savedSelections.length > MAX_HISTORY_SIZE) {
        merged.savedSelections = merged.savedSelections.slice(-MAX_HISTORY_SIZE);
    }
    
    // Update analytics
    merged.analytics.totalSelections = merged.selections.length + merged.savedSelections.length;
    merged.analytics.lastAnalysisUpdate = new Date().toISOString();
    merged.lastUpdated = new Date().toISOString();
    merged.version = 2;
    
    return { merged, addedCount };
}

// Save merged data
async function saveUserHistory(userId, historyData) {
    try {
        await ensureStorageDir();
        const filePath = getUserFilePath(userId);
        console.log('Upload API - Saving data to file:', filePath, 'Data size:', JSON.stringify(historyData).length);
        await fs.writeFile(filePath, JSON.stringify(historyData, null, 2));
        console.log('Upload API - Data saved successfully');
    } catch (saveError) {
        console.error('Upload API - Failed to save data:', saveError);
        throw saveError; // Re-throw to be caught by the main handler
    }
}

// Parse multipart form data manually (simple implementation)
function parseMultipartData(body, boundary) {
    const parts = body.split(`--${boundary}`);
    const files = {};
    
    for (const part of parts) {
        if (part.includes('Content-Disposition: form-data')) {
            const nameMatch = part.match(/name="([^"]+)"/);
            const filenameMatch = part.match(/filename="([^"]+)"/);
            
            if (nameMatch && filenameMatch) {
                const fieldName = nameMatch[1];
                const filename = filenameMatch[1];
                
                // Find the start of file content (after double CRLF)
                const contentStart = part.indexOf('\r\n\r\n') + 4;
                const contentEnd = part.lastIndexOf('\r\n');
                
                if (contentStart > 3 && contentEnd > contentStart) {
                    const content = part.substring(contentStart, contentEnd);
                    files[fieldName] = {
                        filename,
                        content
                    };
                }
            }
        }
    }
    
    return files;
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-ID');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use POST to upload history data.'
        });
    }
    
    try {
        const userId = req.headers['x-user-id'] || generateUserId(req);
        console.log('Upload API - User ID:', userId, 'from header:', !!req.headers['x-user-id']);

        // Ensure storage directory exists before any operations
        await ensureStorageDir();

        // Get content type and boundary for multipart data
        const contentType = req.headers['content-type'] || '';
        
        if (!contentType.includes('multipart/form-data')) {
            return res.status(400).json({
                success: false,
                error: 'Content type must be multipart/form-data for file uploads.'
            });
        }
        
        const boundaryMatch = contentType.match(/boundary=(.+)$/);
        if (!boundaryMatch) {
            return res.status(400).json({
                success: false,
                error: 'Missing boundary in multipart data.'
            });
        }
        
        const boundary = boundaryMatch[1];
        
        // Read the request body
        let body = '';
        for await (const chunk of req) {
            body += chunk.toString();
        }
        
        if (body.length > MAX_FILE_SIZE) {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB.'
            });
        }
        
        // Parse multipart data
        const files = parseMultipartData(body, boundary);
        
        if (!files.historyFile) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded. Please select a JSON file containing your selection history.'
            });
        }
        
        const uploadedFile = files.historyFile;
        
        // Validate file type
        if (!uploadedFile.filename.toLowerCase().endsWith('.json')) {
            return res.status(400).json({
                success: false,
                error: 'Please select a JSON file (.json).'
            });
        }
        
        // Parse the uploaded file content
        let importedData;
        
        try {
            importedData = JSON.parse(uploadedFile.content);
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                error: 'Invalid JSON file. Please ensure the file contains valid JSON data.'
            });
        }
        
        // Clean and validate the imported data
        const cleanedData = cleanImportedData(importedData);

        console.log('Upload API - Cleaned data:', {
            selectionsCount: cleanedData.selections.length,
            savedSelectionsCount: cleanedData.savedSelections.length
        });
        
        if (cleanedData.selections.length === 0 && cleanedData.savedSelections.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid selections found in the uploaded file. Please check the file format.'
            });
        }
        
        // Load existing user data
        const existingData = await loadUserHistory(userId);
        
        // Merge the data
        const { merged, addedCount } = mergeHistoryData(existingData, cleanedData);
        
        // Save the merged data
        await saveUserHistory(userId, merged);

        // Verify the data was saved correctly
        try {
            const verifyPath = getUserFilePath(userId);
            const verifyData = await fs.readFile(verifyPath, 'utf8');
            const verifyParsed = JSON.parse(verifyData);
            console.log('Upload API - Verification: File saved with', verifyParsed.selections?.length || 0, 'selections');

            // List all files in storage directory
            try {
                const files = await fs.readdir(STORAGE_DIR);
                console.log('Upload API - Storage directory contents:', files);
            } catch (listError) {
                console.error('Upload API - Could not list storage directory:', listError.message);
            }
        } catch (verifyError) {
            console.error('Upload API - Verification failed:', verifyError.message);
        }

        res.status(200).json({
            success: true,
            message: `Successfully imported ${addedCount} new selections.`,
            data: {
                totalSelections: merged.selections.length,
                newSelections: merged.selections.length - (existingData.selections.length || 0),
                duplicatesSkipped: cleanedData.selections.length + cleanedData.savedSelections.length - addedCount,
                userId
            }
        });
        
    } catch (error) {
        console.error('Upload history error:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Failed to process uploaded file. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}