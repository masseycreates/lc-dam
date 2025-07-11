// Drawing Results Checker API
// Checks PowerBall results and updates selection status

import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { drawingDate, winningNumbers, powerball } = req.body;

        if (!drawingDate || !winningNumbers || !powerball) {
            return res.status(400).json({ 
                error: 'Missing required fields: drawingDate, winningNumbers, powerball' 
            });
        }

        // Validate winning numbers format
        if (!Array.isArray(winningNumbers) || winningNumbers.length !== 5) {
            return res.status(400).json({ 
                error: 'winningNumbers must be an array of 5 numbers' 
            });
        }

        if (typeof powerball !== 'number' || powerball < 1 || powerball > 26) {
            return res.status(400).json({ 
                error: 'powerball must be a number between 1 and 26' 
            });
        }

        // Function to check if a selection wins
        const checkWin = (selectionNumbers, selectionPowerball, winningNums, winningPB) => {
            const matchedNumbers = selectionNumbers.filter(num => winningNums.includes(num)).length;
            const powerballMatch = selectionPowerball === winningPB;

            // PowerBall prize structure
            if (matchedNumbers === 5 && powerballMatch) return { tier: 'Jackpot', amount: 1000000000 }; // Placeholder jackpot
            if (matchedNumbers === 5) return { tier: 'Match 5', amount: 1000000 };
            if (matchedNumbers === 4 && powerballMatch) return { tier: 'Match 4 + PB', amount: 50000 };
            if (matchedNumbers === 4) return { tier: 'Match 4', amount: 100 };
            if (matchedNumbers === 3 && powerballMatch) return { tier: 'Match 3 + PB', amount: 100 };
            if (matchedNumbers === 3) return { tier: 'Match 3', amount: 7 };
            if (matchedNumbers === 2 && powerballMatch) return { tier: 'Match 2 + PB', amount: 7 };
            if (matchedNumbers === 1 && powerballMatch) return { tier: 'Match 1 + PB', amount: 4 };
            if (powerballMatch) return { tier: 'Match PB', amount: 4 };
            
            return null; // No win
        };

        // Load and update user selection histories
        const STORAGE_DIR = process.env.VERCEL ?
            path.join(require('os').tmpdir(), 'lottery-selections') :
            path.resolve('./data/lottery-selections');

        let updatedCount = 0;
        let totalChecked = 0;

        try {
            const files = await fs.readdir(STORAGE_DIR);
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                const filePath = path.join(STORAGE_DIR, file);
                const data = await fs.readFile(filePath, 'utf8');
                const userHistory = JSON.parse(data);
                
                let fileUpdated = false;
                
                // Check both regular selections and saved selections
                const allSelections = [
                    ...(userHistory.selections || []),
                    ...(userHistory.savedSelections || [])
                ];
                
                for (const selection of allSelections) {
                    // Only check selections for this drawing date that are still pending
                    if (selection.drawingInfo?.targetDrawingDate === drawingDate && 
                        selection.status === 'pending') {
                        
                        totalChecked++;
                        
                        const winResult = checkWin(
                            selection.numbers, 
                            selection.powerball, 
                            winningNumbers, 
                            powerball
                        );
                        
                        if (winResult) {
                            selection.status = 'win';
                            selection.result = 'win';
                            selection.winAmount = winResult.amount;
                            selection.winTier = winResult.tier;
                            selection.checkedAt = new Date().toISOString();
                            updatedCount++;
                            fileUpdated = true;
                        } else {
                            selection.status = 'loss';
                            selection.result = 'loss';
                            selection.winAmount = 0;
                            selection.checkedAt = new Date().toISOString();
                            updatedCount++;
                            fileUpdated = true;
                        }
                    }
                }
                
                // Save updated file if changes were made
                if (fileUpdated) {
                    await fs.writeFile(filePath, JSON.stringify(userHistory, null, 2));
                }
            }
        } catch (error) {
            console.error('Error updating selection results:', error);
        }

        res.json({
            success: true,
            message: `Updated ${updatedCount} selections for drawing ${drawingDate}`,
            data: {
                drawingDate,
                winningNumbers,
                powerball,
                selectionsUpdated: updatedCount,
                selectionsChecked: totalChecked
            }
        });

    } catch (error) {
        console.error('Drawing results check error:', error);
        res.status(500).json({ 
            error: 'Failed to check drawing results',
            details: error.message 
        });
    }
}