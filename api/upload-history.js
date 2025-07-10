// Upload History API - Handle importing selection history from JSON files
// Processes exported selection history data and merges with existing data

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Simple file-based storage directory - use absolute path for consistency
// In serverless environments, use the system temp directory
const STORAGE_DIR = process.env.VERCEL ? 
    path.join(os.tmpdir(), 'lottery-selections') : 
    path.resolve('./data/lottery-selections');

console.log('Upload API - Storage directory configured as:', STORAGE_DIR, 'CWD:', process.cwd(), 'TMPDIR:', os.tmpdir());

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
        throw error;
    }
}

// Generate user ID from browser fingerprint (same logic as selection-history.js)
function generateUserId(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    const fingerprint = userAgent + acceptLanguage + acceptEncoding;
    
    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `user_${Math.abs(hash).toString(36)}`;
}

// Get file path for user data
function getUserFilePath(userId) {
    return path.join(STORAGE_DIR, `${userId}.json`);
}

// Load existing user history
async function loadUserHistory(userId) {
    const filePath = getUserFilePath(userId);
    
    try {
        const data = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(data);
        
        return {
            selections: parsed.selections || [],
            savedSelections: parsed.savedSelections || [],
            analytics: parsed.analytics || {},
            lastUpdated: parsed.lastUpdated || new Date().toISOString(),
            version: parsed.version || 2
        };
    } catch (error) {
        console.log('Upload API - No existing user data found, creating new:', error.message);
        return {
            selections: [],
            savedSelections: [],
            analytics: {},
            lastUpdated: new Date().toISOString(),
            version: 2
        };
    }
}

// Save user history
async function saveUserHistory(userId, data) {
    const filePath = getUserFilePath(userId);
    
    try {
        console.log('Upload API - Saving user history to:', filePath);
        
        const dataToSave = {
            ...data,
            lastUpdated: new Date().toISOString(),
            version: 2
        };
        
        await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
        console.log('Upload API - User history saved successfully');
        
        return true;
    } catch (error) {
        console.error('Upload API - Failed to save user history:', error);
        throw error;
    }
}

// Validate selection entry
function validateSelectionEntry(entry) {
    if (!entry || typeof entry !== 'object') return false;
    
    // Check required fields
    if (!entry.id || typeof entry.id !== 'string') return false;
    if (!Array.isArray(entry.numbers) || entry.numbers.length !== 5) return false;
    if (typeof entry.powerball !== 'number' || entry.powerball < 1 || entry.powerball > 26) return false;
    
    // Validate numbers
    for (const num of entry.numbers) {
        if (typeof num !== 'number' || num < 1 || num > 69) return false;
    }
    
    // Check for duplicates in numbers
    if (new Set(entry.numbers).size !== 5) return false;
    
    return true;
}

// Clean imported data
function cleanImportedData(data) {
    if (!Array.isArray(data)) {
        throw new Error('Imported data must be an array of selections');
    }
    
    const cleaned = [];
    
    for (const entry of data) {
        if (validateSelectionEntry(entry)) {
            // Ensure all required fields exist with defaults
            const cleanEntry = {
                id: entry.id,
                numbers: [...entry.numbers].sort((a, b) => a - b), // Sort numbers
                powerball: entry.powerball,
                name: entry.name || 'Imported Selection',
                source: entry.source || 'Import',
                dateSaved: entry.dateSaved || new Date().toISOString(),
                datePlayed: entry.datePlayed || null,
                result: entry.result || 'pending',
                winAmount: entry.winAmount || 0,
                notes: entry.notes || '',
                confidence: entry.confidence || 50,
                strategy: entry.strategy || 'Unknown'
            };
            
            cleaned.push(cleanEntry);
        } else {
            console.warn('Upload API - Invalid selection entry skipped:', entry);
        }
    }
    
    return cleaned;
}

// Merge history data
function mergeHistoryData(existingData, newData) {
    const existingIds = new Set(existingData.selections.map(s => s.id));
    const newSelections = newData.filter(entry => !existingIds.has(entry.id));
    
    const merged = {
        ...existingData,
        selections: [...existingData.selections, ...newSelections]
    };
    
    // Limit total selections
    if (merged.selections.length > MAX_HISTORY_SIZE) {
        merged.selections = merged.selections.slice(-MAX_HISTORY_SIZE);
    }
    
    return {
        merged,
        addedCount: newSelections.length
    };
}

// Parse multipart form data
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

        // Read the request body
        let body = '';
        for await (const chunk of req) {
            body += chunk.toString();
        }

        console.log('Upload API - Body length:', body.length);

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
        console.log('Upload API - Boundary:', boundary);

        // Parse multipart data
        const files = parseMultipartData(body, boundary);
        console.log('Upload API - Files found:', Object.keys(files));

        // Get the uploaded file
        const historyFile = files.historyFile;
        if (!historyFile) {
            return res.status(400).json({
                success: false,
                error: 'No history file found in upload. Please select a JSON file.'
            });
        }

        console.log('Upload API - File received:', historyFile.filename, 'Content length:', historyFile.content.length);

        // Parse JSON content
        let importedData;
        try {
            importedData = JSON.parse(historyFile.content);
            console.log('Upload API - JSON parsed successfully, entries:', Array.isArray(importedData) ? importedData.length : 'not array');
        } catch (parseError) {
            console.error('Upload API - JSON parse error:', parseError);
            return res.status(400).json({
                success: false,
                error: 'Invalid JSON file. Please check the file format.'
            });
        }

        // Clean and validate the imported data
        const cleanedData = cleanImportedData(importedData);
        console.log('Upload API - Cleaned data:', cleanedData.length, 'valid selections');

        if (cleanedData.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid selections found in the uploaded file. Please check the file format.'
            });
        }

        // Load existing user data
        const existingData = await loadUserHistory(userId);
        console.log('Upload API - Existing data loaded:', {
            selectionsCount: existingData.selections.length,
            savedSelectionsCount: existingData.savedSelections.length
        });

        // Merge the data
        const { merged, addedCount } = mergeHistoryData(existingData, cleanedData);
        console.log('Upload API - Data merged:', {
            selectionsCount: merged.selections.length,
            savedSelectionsCount: merged.savedSelections.length,
            addedCount
        });

        // Save merged data
        if (merged.selections.length > 0) {
            await saveUserHistory(userId, merged);
            console.log('Upload API - File save completed');
        }

        // Return success response
        return res.status(200).json({
            success: true,
            message: `Successfully imported ${addedCount} new selections.`,
            data: {
                userId,
                totalSelections: merged.selections.length,
                newSelections: addedCount,
                existingTotal: existingData.selections.length
            }
        });
        
    } catch (error) {
        console.error('Upload history error:', error);
        console.error('Error stack:', error.stack);
        
        return res.status(500).json({
            success: false,
            error: 'Failed to process uploaded file. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}