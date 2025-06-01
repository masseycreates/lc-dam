// api/diagnose.js - Comprehensive diagnostic tool for PowerBall data sources
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

  const testResults = {
    timestamp: new Date().toISOString(),
    environment: {
      platform: 'Vercel',
      nodeVersion: process.version,
      region: process.env.VERCEL_REGION || 'unknown'
    },
    dataSources: []
  };

  // Test data sources one by one
  const dataSources = [
    {
      name: 'NY State Open Data API',
      url: 'https://data.ny.gov/resource/d6yy-54nr.json?$order=draw_date%20DESC&$limit=3',
      type: 'json',
      timeout: 10000
    },
    {
      name: 'Texas Lottery',
      url: 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/',
      type: 'html',
      timeout: 8000
    },
    {
      name: 'Florida Lottery',
      url: 'https://floridalottery.com/games/draw-games/powerball',
      type: 'html',
      timeout: 8000
    },
    {
      name: 'California Lottery',
      url: 'https://www.calottery.com/en/draw-games/powerball',
      type: 'html',
      timeout: 8000
    },
    {
      name: 'Official Powerball',
      url: 'https://www.powerball.com',
      type: 'html',
      timeout: 8000
    }
  ];

  for (const source of dataSources) {
    const result = {
      name: source.name,
      url: source.url,
      status: 'unknown',
      responseTime: 0,
      statusCode: null,
      error: null,
      dataFound: false,
      dataPreview: null
    };

    try {
      const startTime = Date.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), source.timeout);
      
      const response = await fetch(source.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': source.type === 'json' ? 'application/json' : 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      result.responseTime = Date.now() - startTime;
      result.statusCode = response.status;
      
      if (response.ok) {
        result.status = 'success';
        
        // Try to get some sample data
        if (source.type === 'json') {
          try {
            const data = await response.json();
            result.dataFound = Array.isArray(data) && data.length > 0;
            result.dataPreview = Array.isArray(data) ? 
              `${data.length} records, latest: ${data[0]?.draw_date || 'unknown'}` : 
              'Non-array response';
          } catch (e) {
            result.error = 'Invalid JSON response';
          }
        } else {
          const html = await response.text();
          result.dataFound = html.length > 1000; // Basic check for substantial content
          result.dataPreview = `HTML length: ${html.length}, contains "powerball": ${html.toLowerCase().includes('powerball')}`;
          
          // Check for jackpot patterns
          const jackpotMatch = html.match(/\$([0-9,]+(?:\.[0-9]+)?)\s*Million/i);
          if (jackpotMatch) {
            result.dataPreview += `, found jackpot: ${jackpotMatch[0]}`;
          }
        }
      } else {
        result.status = 'failed';
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }
      
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      if (error.name === 'AbortError') {
        result.error = `Timeout after ${source.timeout}ms`;
      }
    }
    
    testResults.dataSources.push(result);
  }

  // Test our own API endpoints
  const apiTests = [];
  
  try {
    // Test basic API connectivity
    const testResponse = await fetch(`${req.headers['host'] ? `https://${req.headers['host']}` : 'http://localhost:3000'}/api/test`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    apiTests.push({
      endpoint: '/api/test',
      status: testResponse.ok ? 'success' : 'failed',
      statusCode: testResponse.status
    });
  } catch (error) {
    apiTests.push({
      endpoint: '/api/test',
      status: 'error',
      error: error.message
    });
  }

  testResults.apiTests = apiTests;
  testResults.summary = {
    workingDataSources: testResults.dataSources.filter(s => s.status === 'success').length,
    totalDataSources: testResults.dataSources.length,
    avgResponseTime: Math.round(
      testResults.dataSources.reduce((sum, s) => sum + s.responseTime, 0) / testResults.dataSources.length
    ),
    recommendations: []
  };

  // Generate recommendations
  const workingSources = testResults.dataSources.filter(s => s.status === 'success' && s.dataFound);
  if (workingSources.length === 0) {
    testResults.summary.recommendations.push('No data sources are currently working. This may be a network connectivity issue.');
  } else if (workingSources.length < 2) {
    testResults.summary.recommendations.push('Only one data source is working. Consider adding more fallback sources.');
  }

  const slowSources = testResults.dataSources.filter(s => s.responseTime > 5000);
  if (slowSources.length > 0) {
    testResults.summary.recommendations.push(`Slow response times detected from: ${slowSources.map(s => s.name).join(', ')}`);
  }

  return res.status(200).json(testResults);
}