// Simple Upload Test API
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const STORAGE_DIR = process.env.VERCEL ? 
    path.join(os.tmpdir(), 'lottery-selections') : 
    path.resolve('./data/lottery-selections');

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
            error: 'Method not allowed'
        });
    }
    
    try {
        console.log('Simple upload test - Starting');
        console.log('Headers:', req.headers);
        console.log('Storage dir:', STORAGE_DIR);
        
        // Test storage directory
        await fs.mkdir(STORAGE_DIR, { recursive: true });
        console.log('Storage directory created');
        
        // Read request body
        let body = '';
        for await (const chunk of req) {
            body += chunk.toString();
        }
        
        console.log('Body length:', body.length);
        console.log('Body preview:', body.substring(0, 200));
        
        return res.status(200).json({
            success: true,
            message: 'Simple test successful',
            bodyLength: body.length,
            storageDir: STORAGE_DIR
        });
        
    } catch (error) {
        console.error('Simple upload test error:', error);
        console.error('Error stack:', error.stack);
        
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack,
            type: error.constructor.name
        });
    }
}