// api/powerball.js - Simplified and more reliable version
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

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      success: false
    });
  }

  console.log('=== PowerBall API Request Started ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Headers:', req.headers);

  // Simplified, most reliable data sources
  const dataSources = [
    {
      name: 'NY State Open Data API',
      url: 'https://data.ny.gov/resource/d6yy-54nr.json?$order=draw_date%20DESC&$limit=5',
      extractor: extractFromNYState,
      timeout: 12000
    },
    {
      name: 'Texas Lottery HTML',
      url: 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/',
      extractor: extractFromTexasHTML,
      timeout: 10000
    },
    {
      name: 'California Lottery HTML',
      url: 'https://www.calottery.com/en/draw-games/powerball',
      extractor: extractFromCaliforniaHTML,
      timeout: 10000
    }
  ];

  let jackpotData = null;
  let sourceUsed = null;
  let detailedErrors = [];

  // Try each source
  for (let i = 0; i < dataSources.length; i++) {
    const source = dataSources[i];
    console.log(`\n--- Attempting ${source.name} (${i + 1}/${dataSources.length}) ---`);
    
    try {
      const startTime = Date.now();
      
      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`❌ ${source.name}: Timeout after ${source.timeout}ms`);
        controller.abort();
      }, source.timeout);
      
      console.log(`Fetching: ${source.url}`);
      
      const response = await fetch(source.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PowerballBot/1.0)',
          'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      console.log(`Response: ${response.status} ${response.statusText} (${responseTime}ms)`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Get response data
      let data;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        console.log('Parsing as JSON...');
        data = await response.json();
        console.log(`JSON data length: ${Array.isArray(data) ? data.length : 'not array'}`);
      } else {
        console.log('Parsing as text/HTML...');
        data = await response.text();
        console.log(`HTML data length: ${data.length}`);
      }
      
      // Extract jackpot data
      console.log('Extracting jackpot data...');
      jackpotData = source.extractor(data);
      
      if (jackpotData && isValidJackpotData(jackpotData)) {
        sourceUsed = source.name;
        console.log(`✅ SUCCESS from ${source.name}:`);
        console.log(`   Jackpot: ${jackpotData.formatted}`);
        console.log(`   Cash: ${jackpotData.cashFormatted}`);
        console.log(`   Response time: ${responseTime}ms`);
        break;
      } else {
        console.log(`❌ ${source.name}: Invalid data extracted`);
        console.log(`   Data:`, jackpotData);
        throw new Error('No valid jackpot data extracted');
      }
      
    } catch (error) {
      const errorMsg = `${source.name}: ${error.message}`;
      detailedErrors.push({
        source: source.name,
        error: error.message,
        type: error.name,
        url: source.url
      });
      console.log(`❌ ${errorMsg}`);
      continue;
    }
  }

  // Calculate next drawing
  const nextDrawing = calculateNextDrawing();
  
  if (jackpotData && sourceUsed) {
    // SUCCESS
    console.log('\n=== SUCCESS ===');
    const result = {
      success: true,
      dataAvailable: true,
      jackpot: {
        amount: jackpotData.amount,
        cashValue: jackpotData.cashValue,
        formatted: jackpotData.formatted,
        cashFormatted: jackpotData.cashFormatted
      },
      nextDrawing: nextDrawing,
      source: sourceUsed,
      lastUpdated: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      debug: {
        sourcesAttempted: dataSources.length,
        errors: detailedErrors
      }
    };

    res.setHeader('Cache-Control', 's-maxage=3600, max-age=3600');
    return res.status(200).json(result);
    
  } else {
    // FAILURE
    console.log('\n=== FAILURE ===');
    console.log('All sources failed. Errors:', detailedErrors);
    
    const result = {
      success: false,
      dataAvailable: false,
      message: 'LIVE POWERBALL DATA TEMPORARILY UNAVAILABLE',
      details: 'Unable to retrieve current jackpot information from official sources. Please check back later or visit powerball.com directly.',
      nextDrawing: nextDrawing,
      lastAttempted: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      debug: {
        sourcesAttempted: dataSources.length,
        detailedErrors: detailedErrors,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          region: process.env.VERCEL_REGION || 'unknown'
        }
      }
    };

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(503).json(result);
  }
}

// Extraction functions
function extractFromNYState(data) {
  try {
    console.log('NY State extractor called');
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log('NY State: No array data or empty array');
      return null;
    }
    
    console.log(`NY State: Processing ${data.length} records`);
    const latest = data[0];
    console.log('Latest record:', latest);
    
    if (latest && latest.jackpot) {
      const amount = parseFloat(latest.jackpot);
      console.log(`NY State: Parsed amount: ${amount}`);
      
      if (amount >= 20000000 && amount <= 5000000000) {
        const cashValue = latest.cash_value ? 
          parseFloat(latest.cash_value) : 
          Math.round(amount * 0.6);
        
        return {
          amount: amount,
          cashValue: cashValue,
          formatted: `$${Math.round(amount / 1000000)}M`,
          cashFormatted: `$${Math.round(cashValue / 1000000)}M`
        };
      }
    }
    
    console.log('NY State: No valid jackpot found');
    return null;
  } catch (error) {
    console.log('NY State extraction error:', error.message);
    return null;
  }
}

function extractFromTexasHTML(html) {
  try {
    console.log('Texas HTML extractor called');
    console.log(`HTML length: ${html.length}`);
    
    // Look for current jackpot patterns
    const patterns = [
      /Current\s+Est\.\s+Annuitized\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Est\.\s+Annuitized\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /\$([0-9,]+(?:\.[0-9]+)?)\s*Million.*Jackpot/gi
    ];

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      console.log(`Trying pattern ${i + 1}...`);
      
      const match = html.match(pattern);
      if (match) {
        console.log(`Pattern ${i + 1} matched:`, match[0]);
        
        // Extract the number
        const numberMatch = match[0].match(/\$?([0-9,]+(?:\.[0-9]+)?)/);
        if (numberMatch) {
          const amountStr = numberMatch[1].replace(/,/g, '');
          const amount = parseFloat(amountStr) * 1000000;
          
          console.log(`Extracted amount: $${amount}`);
          
          if (amount >= 20000000 && amount <= 5000000000) {
            return {
              amount: amount,
              cashValue: Math.round(amount * 0.6),
              formatted: `$${Math.round(amount / 1000000)}M`,
              cashFormatted: `$${Math.round(amount * 0.6 / 1000000)}M`
            };
          }
        }
      }
    }
    
    console.log('Texas: No jackpot patterns matched');
    return null;
  } catch (error) {
    console.log('Texas HTML extraction error:', error.message);
    return null;
  }
}

function extractFromCaliforniaHTML(html) {
  try {
    console.log('California HTML extractor called');
    console.log(`HTML length: ${html.length}`);
    
    const patterns = [
      /Estimated\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Next\s+Drawing[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Powerball.*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi
    ];

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      console.log(`Trying CA pattern ${i + 1}...`);
      
      const match = html.match(pattern);
      if (match) {
        console.log(`CA Pattern ${i + 1} matched:`, match[0]);
        
        const numberMatch = match[0].match(/\$?([0-9,]+(?:\.[0-9]+)?)/);
        if (numberMatch) {
          const amountStr = numberMatch[1].replace(/,/g, '');
          const amount = parseFloat(amountStr) * 1000000;
          
          console.log(`CA Extracted amount: $${amount}`);
          
          if (amount >= 20000000 && amount <= 5000000000) {
            return {
              amount: amount,
              cashValue: Math.round(amount * 0.6),
              formatted: `$${Math.round(amount / 1000000)}M`,
              cashFormatted: `$${Math.round(amount * 0.6 / 1000000)}M`
            };
          }
        }
      }
    }
    
    console.log('California: No jackpot patterns matched');
    return null;
  } catch (error) {
    console.log('California HTML extraction error:', error.message);
    return null;
  }
}

// Validation function
function isValidJackpotData(data) {
  if (!data || typeof data !== 'object') {
    console.log('Validation failed: not an object');
    return false;
  }
  
  const amount = data.amount;
  const cashValue = data.cashValue;
  
  if (!amount || amount < 20000000 || amount > 5000000000) {
    console.log(`Validation failed: amount ${amount} out of range`);
    return false;
  }
  
  if (!cashValue || cashValue < 10000000 || cashValue > 3000000000) {
    console.log(`Validation failed: cashValue ${cashValue} out of range`);
    return false;
  }
  
  if (cashValue >= amount) {
    console.log('Validation failed: cashValue >= amount');
    return false;
  }
  
  const ratio = cashValue / amount;
  if (ratio < 0.4 || ratio > 0.8) {
    console.log(`Validation failed: ratio ${ratio} out of range`);
    return false;
  }
  
  console.log('Validation passed');
  return true;
}

// Calculate next drawing
function calculateNextDrawing() {
  try {
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    const dayOfWeek = et.getDay();
    const hour = et.getHours();
    
    let daysToAdd = 0;
    
    if (dayOfWeek === 0) { // Sunday
      daysToAdd = 1; // Next Monday
    } else if (dayOfWeek === 1) { // Monday
      daysToAdd = (hour >= 23) ? 2 : 0; // Wed if after 11pm, today if before
    } else if (dayOfWeek === 2) { // Tuesday
      daysToAdd = 1; // Next Wednesday
    } else if (dayOfWeek === 3) { // Wednesday
      daysToAdd = (hour >= 23) ? 3 : 0; // Sat if after 11pm, today if before
    } else if (dayOfWeek === 4 || dayOfWeek === 5) { // Thursday or Friday
      daysToAdd = 6 - dayOfWeek; // Next Saturday
    } else if (dayOfWeek === 6) { // Saturday
      daysToAdd = (hour >= 23) ? 2 : 0; // Mon if after 11pm, today if before
    }
    
    const nextDraw = new Date(et);
    nextDraw.setDate(et.getDate() + daysToAdd);
    
    return {
      date: nextDraw.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/New_York'
      }),
      time: '10:59 PM ET',
      dayOfWeek: nextDraw.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' })
    };
  } catch (error) {
    console.log('Next drawing calculation failed:', error.message);
    return {
      date: 'Check powerball.com',
      time: '10:59 PM ET',
      dayOfWeek: 'Monday, Wednesday, or Saturday'
    };
  }
}
