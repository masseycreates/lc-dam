// Upload History API - Handle importing selection history from JSON files
// Uses localStorage-like approach for serverless environments

import { promises as fs } from 'fs';
import path from 'path';

// For serverless environments, we'll use a different approach
// Since /tmp is ephemeral, we'll store data in the response and use localStorage on client
const IS_SERVERLESS = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;

console.log('Upload API - Environment:', {
    VERCEL: process.env.VERCEL,
    IS_SERVERLESS,
    NODE_ENV: process.env.NODE_ENV
});

const MAX_HISTORY_SIZE = 1000; // Maximum selections per user

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

        // For serverless environments, return the data to be stored client-side
        // The client will merge this with existing data and store in localStorage
        const responseData = {
            selections: cleanedData,
            savedSelections: [], // Imported data goes to selections, not savedSelections
            analytics: {},
            lastUpdated: new Date().toISOString(),
            version: 2
        };

        console.log('Upload API - Returning data for client-side storage');

        // Return success response with data for client-side storage
        return res.status(200).json({
            success: true,
            message: `Successfully processed ${cleanedData.length} selections.`,
            data: {
                userId,
                importedData: responseData,
                totalSelections: cleanedData.length,
                newSelections: cleanedData.length,
                storageMethod: 'client-side'
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