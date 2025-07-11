// Selection History API - Enhanced for cross-device persistence and algorithm integration
// Uses simple file-based storage for cross-browser persistence with advanced analytics

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Simple file-based storage directory - use absolute path for consistency
// In serverless environments, use the system temp directory
const STORAGE_DIR = process.env.VERCEL ?
    path.join(os.tmpdir(), 'lottery-selections') :
    path.resolve('./data/lottery-selections');

console.log('Selection History API - Storage directory configured as:', STORAGE_DIR, 'CWD:', process.cwd(), 'TMPDIR:', os.tmpdir());
const MAX_HISTORY_SIZE = 1000; // Maximum selections per user
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Calculate next PowerBall drawing (same logic as powerball.js)
function calculateNextDrawing() {
    try {
        const now = new Date();
        const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));

        const dayOfWeek = etNow.getDay();
        const hour = etNow.getHours();

        const drawingDays = [1, 3, 6]; // Monday, Wednesday, Saturday
        const drawingHour = 22;
        const drawingMinute = 59;

        let nextDrawingDate = new Date(etNow);
        let found = false;

        if (drawingDays.includes(dayOfWeek)) {
            const todayDrawingTime = new Date(etNow);
            todayDrawingTime.setHours(drawingHour, drawingMinute, 0, 0);

            if (etNow <= todayDrawingTime) {
                nextDrawingDate = todayDrawingTime;
                found = true;
            }
        }

        if (!found) {
            let daysToAdd = 1;

            while (daysToAdd <= 7 && !found) {
                const checkDate = new Date(etNow);
                checkDate.setDate(etNow.getDate() + daysToAdd);
                checkDate.setHours(drawingHour, drawingMinute, 0, 0);

                const checkDay = checkDate.getDay();

                if (drawingDays.includes(checkDay)) {
                    nextDrawingDate = checkDate;
                    found = true;
                }

                daysToAdd++;
            }
        }

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const nextDrawingDayName = dayNames[nextDrawingDate.getDay()];

        return {
            date: nextDrawingDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'America/New_York'
            }),
            time: '10:59 PM ET',
            dayOfWeek: nextDrawingDayName,
            timestamp: nextDrawingDate.toISOString(),
            dateOnly: nextDrawingDate.toISOString().split('T')[0]
        };

    } catch (error) {
        console.error('Next drawing calculation failed:', error.message);
        return {
            date: 'Check powerball.com',
            time: '10:59 PM ET',
            dayOfWeek: 'Mon/Wed/Sat',
            timestamp: null,
            dateOnly: null
        };
    }
}

// Ensure storage directory exists
async function ensureStorageDir() {
    try {
        console.log('Selection History API - Ensuring storage directory exists:', STORAGE_DIR);
        await fs.mkdir(STORAGE_DIR, { recursive: true });
        console.log('Selection History API - Storage directory created/verified');
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
    const filePath = path.join(STORAGE_DIR, `${userId}.json`);
    console.log('Selection History API - Generated file path for user', userId, ':', filePath);
    return filePath;
}

// Load user's selection history
async function loadUserHistory(userId) {
    try {
        const filePath = getUserFilePath(userId);
        console.log('Selection History API - Loading data for user:', userId, 'from path:', filePath);

        // List all files in storage directory
        try {
            const files = await fs.readdir(STORAGE_DIR);
            console.log('Selection History API - Storage directory contents:', files);
        } catch (listError) {
            console.error('Selection History API - Could not list storage directory:', listError.message);
        }

        const data = await fs.readFile(filePath, 'utf8');
        const history = JSON.parse(data);

        console.log('Selection History API - File loaded successfully:', {
            selectionsCount: history.selections?.length || 0,
            savedSelectionsCount: history.savedSelections?.length || 0
        });

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
        console.log('Selection History API - File not found or error loading for user:', userId, 'Error:', error.message);
        // Return empty history if file doesn't exist or is corrupted
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

// Analyze user's selection patterns for algorithm enhancement
function analyzeUserPatterns(history) {
    const analytics = {
        totalSelections: history.selections.length + history.savedSelections.length,
        winningSelections: 0,
        averageConfidence: 0,
        preferredStrategies: {},
        numberFrequency: {},
        powerballFrequency: {},
        patternInsights: {
            favoriteNumbers: [],
            avoidedNumbers: [],
            preferredSums: [],
            consecutiveNumberTendency: 0,
            evenOddBalance: { even: 0, odd: 0 },
            highLowBalance: { high: 0, low: 0 }
        },
        lastAnalysisUpdate: new Date().toISOString()
    };

    const allSelections = [...history.selections, ...history.savedSelections];
    
    if (allSelections.length === 0) return analytics;

    let totalConfidence = 0;
    const numberCounts = {};
    const powerballCounts = {};
    const strategyCounts = {};
    const sums = [];

    allSelections.forEach(selection => {
        // Count winning selections
        if (selection.result && selection.result.isWinner) {
            analytics.winningSelections++;
        }

        // Accumulate confidence scores
        if (selection.confidence) {
            totalConfidence += selection.confidence;
        }

        // Count strategy preferences
        if (selection.strategy) {
            strategyCounts[selection.strategy] = (strategyCounts[selection.strategy] || 0) + 1;
        }

        // Analyze number patterns
        if (selection.numbers && Array.isArray(selection.numbers)) {
            const sum = selection.numbers.reduce((a, b) => a + b, 0);
            sums.push(sum);

            selection.numbers.forEach(num => {
                numberCounts[num] = (numberCounts[num] || 0) + 1;
                
                // Track even/odd balance
                if (num % 2 === 0) {
                    analytics.patternInsights.evenOddBalance.even++;
                } else {
                    analytics.patternInsights.evenOddBalance.odd++;
                }

                // Track high/low balance (1-34 low, 35-69 high)
                if (num <= 34) {
                    analytics.patternInsights.highLowBalance.low++;
                } else {
                    analytics.patternInsights.highLowBalance.high++;
                }
            });
        }

        // Analyze powerball patterns
        if (selection.powerball) {
            powerballCounts[selection.powerball] = (powerballCounts[selection.powerball] || 0) + 1;
        }
    });

    // Calculate averages and insights
    analytics.averageConfidence = allSelections.length > 0 ? totalConfidence / allSelections.length : 0;
    analytics.preferredStrategies = strategyCounts;
    analytics.numberFrequency = numberCounts;
    analytics.powerballFrequency = powerballCounts;

    // Find favorite and avoided numbers
    const sortedNumbers = Object.entries(numberCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([num]) => parseInt(num));
    
    analytics.patternInsights.favoriteNumbers = sortedNumbers.slice(0, 10);
    
    // Find avoided numbers (numbers 1-69 that appear less frequently)
    const allPossibleNumbers = Array.from({length: 69}, (_, i) => i + 1);
    const avoidedNumbers = allPossibleNumbers
        .filter(num => !numberCounts[num] || numberCounts[num] < Math.max(1, allSelections.length * 0.1))
        .slice(0, 10);
    
    analytics.patternInsights.avoidedNumbers = avoidedNumbers;

    // Calculate preferred sum ranges
    if (sums.length > 0) {
        sums.sort((a, b) => a - b);
        const q1 = sums[Math.floor(sums.length * 0.25)];
        const q3 = sums[Math.floor(sums.length * 0.75)];
        analytics.patternInsights.preferredSums = [q1, q3];
    }

    return analytics;
}

// Save user's selection history with analytics update
async function saveUserHistory(userId, history) {
    try {
        await ensureStorageDir();
        
        // Update analytics
        history.analytics = analyzeUserPatterns(history);
        
        // Add metadata
        history.lastUpdated = new Date().toISOString();
        history.version = history.version || 2;
        
        // Limit history size
        if (history.selections.length > MAX_HISTORY_SIZE) {
            history.selections = history.selections.slice(-MAX_HISTORY_SIZE);
        }
        if (history.savedSelections.length > MAX_HISTORY_SIZE) {
            history.savedSelections = history.savedSelections.slice(-MAX_HISTORY_SIZE);
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-ID');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const userId = req.headers['x-user-id'] || generateUserId(req);
        console.log('Selection History API - Processing request for user:', userId, 'Method:', req.method, 'Has header:', !!req.headers['x-user-id']);

        switch (req.method) {
            case 'GET':
                // Get user's selection history with analytics
                await ensureStorageDir();
                const { type, drawingDate, nextDrawing } = req.query;
                const history = await loadUserHistory(userId);

                if (type === 'analytics') {
                    return res.status(200).json({
                        success: true,
                        data: history.analytics,
                        userId: userId
                    });
                } else if (type === 'saved') {
                    let savedSelections = history.savedSelections;

                    // Filter by drawing date if specified
                    if (drawingDate) {
                        savedSelections = savedSelections.filter(selection =>
                            selection.drawingInfo?.targetDrawingDate === drawingDate
                        );
                    }

                    // Filter for next drawing if specified
                    if (nextDrawing === 'true') {
                        const nextDrawingInfo = calculateNextDrawing();
                        savedSelections = savedSelections.filter(selection =>
                            selection.drawingInfo?.targetDrawingDate === nextDrawingInfo.dateOnly ||
                            selection.drawingInfo?.isForNextDrawing === true
                        );
                    }

                    return res.status(200).json({
                        success: true,
                        data: {
                            savedSelections: savedSelections,
                            nextDrawing: nextDrawing === 'true' ? calculateNextDrawing() : null,
                            totalSavedSelections: history.savedSelections.length,
                            filteredCount: savedSelections.length
                        },
                        userId: userId
                    });
                } else if (type === 'nextDrawing') {
                    // Return next drawing info
                    return res.status(200).json({
                        success: true,
                        data: calculateNextDrawing(),
                        userId: userId
                    });
                } else {
                    return res.status(200).json({
                        success: true,
                        data: history,
                        userId: userId
                    });
                }
                
            case 'POST':
                // Add new selection to history or saved selections
                const { selection, saveType = 'history' } = req.body;
                
                if (!selection || !selection.numbers || !selection.powerball) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid selection data'
                    });
                }
                
                const currentHistory = await loadUserHistory(userId);

                // Get next drawing info for saved selections
                let nextDrawingInfo = null;
                if (saveType === 'saved') {
                    nextDrawingInfo = calculateNextDrawing();
                }

                // Add new selection with metadata
                const newSelection = {
                    ...selection,
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toISOString(),
                    status: 'pending',
                    saveType: saveType,
                    deviceInfo: {
                        userAgent: req.headers['user-agent']?.substring(0, 100) || 'unknown',
                        timestamp: new Date().toISOString()
                    },
                    // Add drawing association for saved selections
                    drawingInfo: saveType === 'saved' ? {
                        targetDrawingDate: selection.targetDrawingDate || nextDrawingInfo?.dateOnly || null,
                        targetDrawingTimestamp: selection.targetDrawingTimestamp || nextDrawingInfo?.timestamp || null,
                        drawingDay: selection.drawingDay || nextDrawingInfo?.dayOfWeek || null,
                        drawingDisplayDate: nextDrawingInfo?.date || null,
                        drawingTime: nextDrawingInfo?.time || null,
                        associatedAt: new Date().toISOString(),
                        isForNextDrawing: selection.isForNextDrawing !== false, // Default to true for saved selections
                        autoAssociated: !selection.targetDrawingDate // Mark if we auto-associated with next drawing
                    } : null
                };
                
                if (saveType === 'saved') {
                    currentHistory.savedSelections.push(newSelection);
                } else {
                    currentHistory.selections.push(newSelection);
                }
                
                const saved = await saveUserHistory(userId, currentHistory);
                
                if (saved) {
                    return res.status(200).json({
                        success: true,
                        data: newSelection,
                        analytics: currentHistory.analytics,
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
                const { selectionId, updates, targetType = 'history' } = req.body;
                
                if (!selectionId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Selection ID required'
                    });
                }
                
                const historyToUpdate = await loadUserHistory(userId);
                const targetArray = targetType === 'saved' ? historyToUpdate.savedSelections : historyToUpdate.selections;
                const selectionIndex = targetArray.findIndex(s => s.id === selectionId);
                
                if (selectionIndex === -1) {
                    return res.status(404).json({
                        success: false,
                        error: 'Selection not found'
                    });
                }
                
                // Update selection
                targetArray[selectionIndex] = {
                    ...targetArray[selectionIndex],
                    ...updates,
                    lastUpdated: new Date().toISOString()
                };
                
                const updateSaved = await saveUserHistory(userId, historyToUpdate);
                
                if (updateSaved) {
                    return res.status(200).json({
                        success: true,
                        data: targetArray[selectionIndex],
                        analytics: historyToUpdate.analytics
                    });
                } else {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to update selection'
                    });
                }
                
            case 'DELETE':
                // Delete selection or clear history
                const { selectionId: deleteId, clearAll, targetType: deleteTargetType = 'history' } = req.body;
                
                const historyToDelete = await loadUserHistory(userId);
                
                if (clearAll) {
                    // Clear specified type or all history
                    if (deleteTargetType === 'saved') {
                        historyToDelete.savedSelections = [];
                    } else if (deleteTargetType === 'all') {
                        historyToDelete.selections = [];
                        historyToDelete.savedSelections = [];
                    } else {
                        historyToDelete.selections = [];
                    }
                } else if (deleteId) {
                    // Delete specific selection
                    if (deleteTargetType === 'saved') {
                        historyToDelete.savedSelections = historyToDelete.savedSelections.filter(s => s.id !== deleteId);
                    } else {
                        historyToDelete.selections = historyToDelete.selections.filter(s => s.id !== deleteId);
                    }
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
                        data: historyToDelete,
                        analytics: historyToDelete.analytics
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