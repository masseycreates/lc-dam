// api/diagnose.js - Enhanced diagnostic tool with real-time testing
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
      region: process.env.VERCEL_REGION || 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      memory: process.memoryUsage()
    },
    dataSources: [],
    networking: {
      dnsResolution: [],
      httpConnectivity: []
    }
  };

  // Enhanced data sources with realistic testing
  const dataSources = [
    {
      name: 'NY State Open Data API',
      url: 'https://data.ny.gov/resource/d6yy-54nr.json?$order=draw_date%20DESC&$limit=3',
      type: 'json',
      timeout: 15000,
      expectedFields: ['jackpot', 'draw_date', 'winning_numbers']
    },
    {
      name: 'Lottery API Hub',
      url: 'https://api.lottery-hub.com/v1/powerball/latest',
      type: 'json',
      timeout: 12000,
      expectedFields: ['jackpot', 'amount', 'prize']
    },
    {
      name: 'Texas Lottery Website',
      url: 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/',
      type: 'html',
      timeout: 10000,
      expectedContent: ['jackpot', 'million', 'powerball']
    },
    {
      name: 'California Lottery Website',
      url: 'https://www.calottery.com/en/draw-games/powerball',
      type: 'html',
      timeout: 10000,
      expectedContent: ['jackpot', 'million', 'estimated']
    },
    {
      name: 'Florida Lottery Website',
      url: 'https://www.flalottery.com/powerball',
      type: 'html',
      timeout: 8000,
      expectedContent: ['jackpot', 'million', 'powerball']
    },
    {
      name: 'Official Powerball Website',
      url: 'https://www.powerball.com',
      type: 'html',
      timeout: 8000,
      expectedContent: ['jackpot', 'million', 'next drawing']
    }
  ];

  // Test DNS resolution first
  console.log('=== Starting DNS Resolution Tests ===');
  const dnsTests = ['data.ny.gov', 'texaslottery.com', 'calottery.com', 'powerball.com'];
  for (const domain of dnsTests) {
    try {
      const start = Date.now();
      // Simple connectivity test
      const testResponse = await fetch(`https://${domain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      testResults.networking.dnsResolution.push({
        domain,
        status: 'resolved',
        responseTime: Date.now() - start,
        statusCode: testResponse.status
      });
    } catch (error) {
      testResults.networking.dnsResolution.push({
        domain,
        status: 'failed',
        error: error.message
      });
    }
  }

  // Test each data source thoroughly
  console.log('=== Starting Data Source Tests ===');
  for (const source of dataSources) {
    const result = {
      name: source.name,
      url: source.url,
      status: 'unknown',
      responseTime: 0,
      statusCode: null,
      error: null,
      dataFound: false,
      dataPreview: null,
      contentAnalysis: {},
      jackpotExtracted: null
    };

    try {
      const startTime = Date.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), source.timeout);
      
      console.log(`Testing ${source.name}...`);
      
      const response = await fetch(source.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': source.type === 'json' ? 'application/json' : 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      result.responseTime = Date.now() - startTime;
      result.statusCode = response.status;
      
      if (response.ok) {
        result.status = 'success';
        
        // Analyze response content
        if (source.type === 'json') {
          try {
            const data = await response.json();
            result.dataFound = Array.isArray(data) && data.length > 0;
            
            if (result.dataFound) {
              const sample = data[0];
              result.contentAnalysis = {
                recordCount: data.length,
                sampleFields: Object.keys(sample || {}),
                hasExpectedFields: source.expectedFields?.filter(field => 
                  sample && sample.hasOwnProperty(field)
                ) || []
              };
              
              // Try to extract jackpot
              if (sample && sample.jackpot) {
                const jackpotStr = sample.jackpot.toString().replace(/[$,]/g, '');
                const amount = parseFloat(jackpotStr);
                if (amount >= 20000000 && amount <= 5000000000) {
                  result.jackpotExtracted = {
                    amount: amount,
                    formatted: formatJackpot(amount),
                    source: 'jackpot field'
                  };
                }
              }
              
              result.dataPreview = `${data.length} records, latest: ${sample?.draw_date || sample?.date || 'unknown date'}`;
            } else {
              result.dataPreview = 'Empty or invalid JSON response';
            }
          } catch (e) {
            result.error = `JSON parse error: ${e.message}`;
            result.status = 'failed';
          }
        } else {
          // HTML content analysis
          const html = await response.text();
          result.dataFound = html.length > 1000;
          
          // Check for expected content
          const contentChecks = source.expectedContent?.map(term => ({
            term,
            found: html.toLowerCase().includes(term.toLowerCase()),
            count: (html.toLowerCase().match(new RegExp(term.toLowerCase(), 'g')) || []).length
          })) || [];
          
          result.contentAnalysis = {
            htmlLength: html.length,
            contentChecks,
            hasExpectedContent: contentChecks.filter(check => check.found).length
          };
          
          // Try to extract jackpot from HTML
          const jackpotPatterns = [
            /\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
            /\$([0-9,]+(?:\.[0-9]+)?)\s*Billion/gi,
            /jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)/gi
          ];
          
          for (const pattern of jackpotPatterns) {
            const matches = [...html.matchAll(pattern)];
            if (matches.length > 0) {
              for (const match of matches) {
                const amountStr = match[1].replace(/,/g, '');
                let amount = parseFloat(amountStr);
                
                // Convert to actual amount if needed
                if (html.toLowerCase().includes('million') && amount < 1000) {
                  amount *= 1000000;
                } else if (html.toLowerCase().includes('billion') && amount < 100) {
                  amount *= 1000000000;
                }
                
                if (amount >= 20000000 && amount <= 5000000000) {
                  result.jackpotExtracted = {
                    amount: amount,
                    formatted: formatJackpot(amount),
                    source: `HTML pattern: ${match[0]}`,
                    matchedText: match[0]
                  };
                  break;
                }
              }
              if (result.jackpotExtracted) break;
            }
          }
          
          result.dataPreview = `HTML (${html.length} chars), has powerball: ${html.toLowerCase().includes('powerball')}, has jackpot: ${html.toLowerCase().includes('jackpot')}`;
        }
      } else {
        result.status = 'failed';
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }
      
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        result.error = `Timeout after ${source.timeout}ms`;
      }
    }
    
    testResults.dataSources.push(result);
  }

  // Test internal API endpoints
  console.log('=== Testing Internal APIs ===');
  const apiTests = [];
  
  try {
    const baseUrl = req.headers['host'] ? `https://${req.headers['host']}` : 'http://localhost:3000';
    
    // Test the main powerball API
    const pbResponse = await fetch(`${baseUrl}/api/powerball`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000)
    });
    
    const pbData = await pbResponse.json();
    
    apiTests.push({
      endpoint: '/api/powerball',
      status: pbResponse.ok ? 'success' : 'failed',
      statusCode: pbResponse.status,
      dataAvailable: pbData.dataAvailable || false,
      source: pbData.source || 'unknown',
      jackpot: pbData.jackpot || null,
      responseTime: 'N/A'
    });
  } catch (error) {
    apiTests.push({
      endpoint: '/api/powerball',
      status: 'error',
      error: error.message
    });
  }

  testResults.apiTests = apiTests;

  // Generate comprehensive summary and recommendations
  const workingDataSources = testResults.dataSources.filter(s => s.status === 'success');
  const sourcesWithJackpot = testResults.dataSources.filter(s => s.jackpotExtracted);
  const avgResponseTime = testResults.dataSources.length > 0 ? 
    Math.round(testResults.dataSources.reduce((sum, s) => sum + s.responseTime, 0) / testResults.dataSources.length) : 0;

  testResults.summary = {
    workingDataSources: workingDataSources.length,
    totalDataSources: testResults.dataSources.length,
    sourcesWithJackpotData: sourcesWithJackpot.length,
    avgResponseTime: avgResponseTime,
    dnsIssues: testResults.networking.dnsResolution.filter(d => d.status === 'failed').length,
    recommendations: []
  };

  // Generate specific recommendations
  if (sourcesWithJackpot.length === 0) {
    testResults.summary.recommendations.push('❌ CRITICAL: No data sources are returning valid jackpot information. All lottery data extraction is failing.');
  } else if (sourcesWithJackpot.length < 2) {
    testResults.summary.recommendations.push('⚠️ WARNING: Only one data source has valid jackpot data. Add more reliable backup sources.');
  } else {
    testResults.summary.recommendations.push('✅ GOOD: Multiple data sources are providing jackpot information.');
  }

  if (workingDataSources.length === 0) {
    testResults.summary.recommendations.push('❌ CRITICAL: No data sources are accessible. This indicates a network connectivity issue.');
  }

  const slowSources = testResults.dataSources.filter(s => s.responseTime > 10000);
  if (slowSources.length > 0) {
    testResults.summary.recommendations.push(`⚠️ SLOW: Response times over 10s detected: ${slowSources.map(s => s.name).join(', ')}`);
  }

  const dnsFailures = testResults.networking.dnsResolution.filter(d => d.status === 'failed');
  if (dnsFailures.length > 0) {
    testResults.summary.recommendations.push(`❌ DNS: Cannot resolve domains: ${dnsFailures.map(d => d.domain).join(', ')}`);
  }

  // API status check
  const mainAPIWorking = apiTests.find(t => t.endpoint === '/api/powerball' && t.status === 'success');
  if (mainAPIWorking && mainAPIWorking.dataAvailable) {
    testResults.summary.recommendations.push('✅ MAIN API: Powerball API is working and returning live data.');
  } else if (mainAPIWorking) {
    testResults.summary.recommendations.push('⚠️ MAIN API: Powerball API is responding but not returning live data.');
  } else {
    testResults.summary.recommendations.push('❌ MAIN API: Powerball API is not responding correctly.');
  }

  return res.status(200).json(testResults);
}

// Helper function to format jackpot amounts
function formatJackpot(amount) {
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `$${Math.round(amount / 1000000)}M`;
  } else {
    return `$${amount.toLocaleString()}`;
  }
}
