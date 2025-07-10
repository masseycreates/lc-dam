// Debug endpoint to list storage directory contents
import { promises as fs } from 'fs';
import path from 'path';

const STORAGE_DIR = process.env.VERCEL ? '/tmp/lottery-selections' : path.resolve('./data/lottery-selections');

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-ID');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        console.log('Debug API - Storage directory:', STORAGE_DIR);
        console.log('Debug API - Current working directory:', process.cwd());
        
        // List all files in storage directory
        const files = await fs.readdir(STORAGE_DIR);
        console.log('Debug API - Files found:', files);
        
        // Get file details
        const fileDetails = [];
        for (const file of files) {
            try {
                const filePath = path.join(STORAGE_DIR, file);
                const stats = await fs.stat(filePath);
                const content = await fs.readFile(filePath, 'utf8');
                const data = JSON.parse(content);
                
                fileDetails.push({
                    filename: file,
                    size: stats.size,
                    modified: stats.mtime,
                    selectionsCount: data.selections?.length || 0,
                    savedSelectionsCount: data.savedSelections?.length || 0
                });
            } catch (fileError) {
                fileDetails.push({
                    filename: file,
                    error: fileError.message
                });
            }
        }
        
        res.status(200).json({
            success: true,
            storageDir: STORAGE_DIR,
            cwd: process.cwd(),
            files: fileDetails
        });
        
    } catch (error) {
        console.error('Debug API error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            storageDir: STORAGE_DIR,
            cwd: process.cwd()
        });
    }
}