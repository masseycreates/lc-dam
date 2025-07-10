// Test File System API
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const STORAGE_DIR = process.env.VERCEL ?
    path.join(os.tmpdir(), 'lottery-selections') :
    path.resolve('./data/lottery-selections');

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const results = {
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                VERCEL: process.env.VERCEL,
                VERCEL_ENV: process.env.VERCEL_ENV,
                cwd: process.cwd(),
                tmpdir: os.tmpdir(),
                storageDir: STORAGE_DIR
            },
            tests: {}
        };
        
        // Test 1: Create directory
        try {
            await fs.mkdir(STORAGE_DIR, { recursive: true });
            results.tests.createDirectory = { success: true };
        } catch (error) {
            results.tests.createDirectory = { success: false, error: error.message };
        }
        
        // Test 2: Write file
        const testFile = path.join(STORAGE_DIR, 'test-file.json');
        const testData = { test: true, timestamp: new Date().toISOString() };
        try {
            await fs.writeFile(testFile, JSON.stringify(testData, null, 2));
            results.tests.writeFile = { success: true, path: testFile };
        } catch (error) {
            results.tests.writeFile = { success: false, error: error.message };
        }
        
        // Test 3: Read file
        try {
            const data = await fs.readFile(testFile, 'utf8');
            const parsed = JSON.parse(data);
            results.tests.readFile = { success: true, data: parsed };
        } catch (error) {
            results.tests.readFile = { success: false, error: error.message };
        }
        
        // Test 4: List directory
        try {
            const files = await fs.readdir(STORAGE_DIR);
            results.tests.listDirectory = { success: true, files };
        } catch (error) {
            results.tests.listDirectory = { success: false, error: error.message };
        }
        
        // Test 5: Delete file
        try {
            await fs.unlink(testFile);
            results.tests.deleteFile = { success: true };
        } catch (error) {
            results.tests.deleteFile = { success: false, error: error.message };
        }
        
        res.status(200).json(results);
        
    } catch (error) {
        res.status(500).json({
            error: 'Test failed',
            message: error.message,
            stack: error.stack
        });
    }
}