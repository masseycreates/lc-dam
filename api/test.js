// api/test.js - Simple test endpoint to verify API is working
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return res.status(200).json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    environment: 'vercel',
    powerballApiStatus: 'ready',
    deployment: {
      platform: 'Vercel',
      nodeVersion: process.version,
      region: process.env.VERCEL_REGION || 'unknown'
    }
  });
}