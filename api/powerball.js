// api/powerball.js - Complete fixed version with corrected next drawing calculation
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

  // Enhanced data sources with better reliability
  const dataSources = [
    {
      name: 'NY State Open Data API',
      url: 'https://data.ny.gov/resource/d6yy-54nr.json?$order=draw_date%20DESC&$limit=3',
      extractor: extractFromNYState,
      timeout: 15000,
      priority: 1
    },
    {
      name: 'Lottery API Hub',
      url: 'https://api.lottery-hub.com/v1/powerball/latest',
      extractor: extractFromLotteryHub,
      timeout: 12000,
      priority: 2
    },
    {
      name: 'Texas Lottery Scraper',
      url: 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/',
      extractor: extractFromTexasHTML,
      timeout: 10000,
      priority: 3
    },
    {
      name: 'California Lottery Scraper',
      url: 'https://www.calottery.com/en/draw-games/powerball',
      extractor: extractFromCaliforniaHTML,
      timeout: 10000,
      priority: 4
    },
    {
      name: 'Florida Lottery Scraper',
      url: 'https://www.flalottery.com/powerball',
      extractor: extractFromFloridaHTML,
      timeout: 8000,
      priority: 5
    }
  ];

  let jackpotData = null;
  let sourceUsed = null;
  let detailedErrors = [];

  // Try each source in priority order
  for (const source of dataSources) {
    console.log(`\n--- Attempting ${source.name} (Priority: ${source.priority}) ---`);
    
    try {
      const startTime = Date.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`❌ ${source.name}: Timeout after ${source.timeout}ms`);
        controller.abort();
      }, source.timeout);
      
      console.log(`Fetching: ${source.url}`);
      
      const response = await fetch(source.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': source.url.includes('api.') ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Referer': 'https://www.powerball.com/',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site'
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
        console.log(`JSON data received, type: ${Array.isArray(data) ? 'array' : typeof data}`);
      } else {
        console.log('Parsing as HTML...');
        data = await response.text();
        console.log(`HTML data length: ${data.length} characters`);
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
        console.log(`❌ ${source.name}: Invalid or no data extracted`);
        console.log(`   Extracted data:`, jackpotData);
        throw new Error('No valid jackpot data extracted from response');
      }
      
    } catch (error) {
      const errorDetails = {
        source: source.name,
        error: error.message,
        type: error.name,
        url: source.url,
        priority: source.priority
      };
      detailedErrors.push(errorDetails);
      console.log(`❌ ${source.name} failed: ${error.message}`);
      continue;
    }
  }

  // Calculate next drawing
  const nextDrawing = calculateNextDrawing();
  
  if (jackpotData && sourceUsed) {
    // SUCCESS - Return live data
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
        errors: detailedErrors,
        successfulSource: sourceUsed
      }
    };

    res.setHeader('Cache-Control', 's-maxage=1800, max-age=1800'); // 30 minutes cache
    return res.status(200).json(result);
    
  } else {
    // FAILURE - Return fallback data with next drawing info
    console.log('\n=== FAILURE - All sources failed ===');
    console.log('Detailed errors:', detailedErrors);
    
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

// Enhanced extraction functions
function extractFromNYState(data) {
  try {
    console.log('NY State extractor - processing data...');
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log('NY State: No array data or empty array');
      return null;
    }
    
    console.log(`NY State: Processing ${data.length} records`);
    const latest = data[0];
    console.log('Latest record fields:', Object.keys(latest || {}));
    console.log('Latest record:', latest);
    
    if (latest && latest.jackpot) {
      const jackpotStr = latest.jackpot.toString().replace(/[$,]/g, '');
      const amount = parseFloat(jackpotStr);
      console.log(`NY State: Parsed jackpot amount: ${amount}`);
      
      if (amount >= 20000000 && amount <= 5000000000) {
        const cashValue = latest.cash_value ? 
          parseFloat(latest.cash_value.toString().replace(/[$,]/g, '')) : 
          Math.round(amount * 0.6);
        
        return {
          amount: amount,
          cashValue: cashValue,
          formatted: formatJackpot(amount),
          cashFormatted: formatJackpot(cashValue)
        };
      }
    }
    
    console.log('NY State: No valid jackpot found in data');
    return null;
  } catch (error) {
    console.log('NY State extraction error:', error.message);
    return null;
  }
}

// New lottery API extractor
function extractFromLotteryHub(data) {
  try {
    console.log('Lottery Hub extractor - processing data...');
    
    if (data && typeof data === 'object') {
      let amount = 0;
      let cashValue = 0;
      
      // Try different possible field names
      if (data.jackpot) amount = parseFloat(data.jackpot.toString().replace(/[$,]/g, ''));
      else if (data.amount) amount = parseFloat(data.amount.toString().replace(/[$,]/g, ''));
      else if (data.prize) amount = parseFloat(data.prize.toString().replace(/[$,]/g, ''));
      
      if (data.cash_value) cashValue = parseFloat(data.cash_value.toString().replace(/[$,]/g, ''));
      else if (data.cashValue) cashValue = parseFloat(data.cashValue.toString().replace(/[$,]/g, ''));
      else if (amount > 0) cashValue = Math.round(amount * 0.6);
      
      console.log(`Lottery Hub: amount=${amount}, cashValue=${cashValue}`);
      
      if (amount >= 20000000 && amount <= 5000000000) {
        return {
          amount: amount,
          cashValue: cashValue,
          formatted: formatJackpot(amount),
          cashFormatted: formatJackpot(cashValue)
        };
      }
    }
    
    console.log('Lottery Hub: No valid data found');
    return null;
  } catch (error) {
    console.log('Lottery Hub extraction error:', error.message);
    return null;
  }
}

function extractFromTexasHTML(html) {
  try {
    console.log('Texas HTML extractor - processing...');
    console.log(`HTML length: ${html.length} characters`);
    
    // Enhanced patterns for Texas lottery
    const patterns = [
      /Current\s+Est\.\s+Annuitized\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Est\.\s+Annuitized\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /\$([0-9,]+(?:\.[0-9]+)?)\s*Million.*?Jackpot/gi,
      /powerball.*?\$([0-9,]+(?:\.[0-9]+)?)\s*million/gi,
      /estimated.*?\$([0-9,]+(?:\.[0-9]+)?)\s*million/gi
    ];

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      console.log(`Trying Texas pattern ${i + 1}...`);
      
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        console.log(`Texas pattern ${i + 1} found ${matches.length} matches`);
        
        for (const match of matches) {
          const amountStr = match[1].replace(/,/g, '');
          const amount = parseFloat(amountStr) * 1000000; // Convert millions to actual amount
          
          console.log(`Texas extracted amount: $${amount}`);
          
          if (amount >= 20000000 && amount <= 5000000000) {
            return {
              amount: amount,
              cashValue: Math.round(amount * 0.6),
              formatted: formatJackpot(amount),
              cashFormatted: formatJackpot(amount * 0.6)
            };
          }
        }
      }
    }
    
    console.log('Texas: No valid jackpot patterns matched');
    return null;
  } catch (error) {
    console.log('Texas HTML extraction error:', error.message);
    return null;
  }
}

function extractFromCaliforniaHTML(html) {
  try {
    console.log('California HTML extractor - processing...');
    console.log(`HTML length: ${html.length} characters`);
    
    const patterns = [
      /Estimated\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Next\s+Drawing[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Powerball.*?\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /jackpot.*?\$([0-9,]+(?:\.[0-9]+)?)\s*million/gi,
      /\$([0-9,]+(?:\.[0-9]+)?)\s*million.*?powerball/gi
    ];

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      console.log(`Trying California pattern ${i + 1}...`);
      
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        console.log(`California pattern ${i + 1} found ${matches.length} matches`);
        
        for (const match of matches) {
          const amountStr = match[1].replace(/,/g, '');
          const amount = parseFloat(amountStr) * 1000000;
          
          console.log(`California extracted amount: $${amount}`);
          
          if (amount >= 20000000 && amount <= 5000000000) {
            return {
              amount: amount,
              cashValue: Math.round(amount * 0.6),
              formatted: formatJackpot(amount),
              cashFormatted: formatJackpot(amount * 0.6)
            };
          }
        }
      }
    }
    
    console.log('California: No valid jackpot patterns matched');
    return null;
  } catch (error) {
    console.log('California HTML extraction error:', error.message);
    return null;
  }
}

// New Florida extractor
function extractFromFloridaHTML(html) {
  try {
    console.log('Florida HTML extractor - processing...');
    console.log(`HTML length: ${html.length} characters`);
    
    const patterns = [
      /Estimated\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /jackpot.*?\$([0-9,]+(?:\.[0-9]+)?)\s*million/gi,
      /powerball.*?\$([0-9,]+(?:\.[0-9]+)?)\s*million/gi,
      /\$([0-9,]+(?:\.[0-9]+)?)\s*million.*?jackpot/gi
    ];

    for (const pattern of patterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        for (const match of matches) {
          const amountStr = match[1].replace(/,/g, '');
          const amount = parseFloat(amountStr) * 1000000;
          
          if (amount >= 20000000 && amount <= 5000000000) {
            return {
              amount: amount,
              cashValue: Math.round(amount * 0.6),
              formatted: formatJackpot(amount),
              cashFormatted: formatJackpot(amount * 0.6)
            };
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.log('Florida HTML extraction error:', error.message);
    return null;
  }
}

// Helper functions
function formatJackpot(amount) {
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `$${Math.round(amount / 1000000)}M`;
  } else {
    return `$${amount.toLocaleString()}`;
  }
}

function isValidJackpotData(data) {
  if (!data || typeof data !== 'object') {
    console.log('Validation failed: not an object');
    return false;
  }
  
  const amount = data.amount;
  const cashValue = data.cashValue;
  
  if (!amount || amount < 20000000 || amount > 5000000000) {
    console.log(`Validation failed: amount ${amount} out of range [20M-5B]`);
    return false;
  }
  
  if (!cashValue || cashValue < 10000000 || cashValue > 3000000000) {
    console.log(`Validation failed: cashValue ${cashValue} out of range [10M-3B]`);
    return false;
  }
  
  if (cashValue >= amount) {
    console.log('Validation failed: cashValue >= amount');
    return false;
  }
  
  const ratio = cashValue / amount;
  if (ratio < 0.4 || ratio > 0.8) {
    console.log(`Validation failed: cash ratio ${ratio} out of range [0.4-0.8]`);
    return false;
  }
  
  console.log('✅ Validation passed');
  return true;
}

// FIXED: Completely rewritten next drawing calculation
function calculateNextDrawing() {
  try {
    console.log('=== Calculating Next Drawing ===');
    
    // Get current time in Eastern Time Zone (where Powerball drawings occur)
    const now = new Date();
    const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    console.log('Current UTC time:', now.toISOString());
    console.log('Current ET time:', etNow.toString());
    
    const dayOfWeek = etNow.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const hour = etNow.getHours();
    const minute = etNow.getMinutes();
    
    console.log(`Current ET: ${getDayName(dayOfWeek)} (${dayOfWeek}), ${hour}:${minute.toString().padStart(2, '0')}`);
    
    // Powerball drawings are Monday (1), Wednesday (3), Saturday (6) at 10:59 PM ET
    const drawingDays = [1, 3, 6]; // Monday, Wednesday, Saturday
    const drawingHour = 22; // 10 PM (drawings are at 10:59 PM)
    const drawingMinute = 59;
    
    let nextDrawingDate = new Date(etNow);
    let found = false;
    
    // Check if today is a drawing day and we haven't passed the drawing time yet
    if (drawingDays.includes(dayOfWeek)) {
      const todayDrawingTime = new Date(etNow);
      todayDrawingTime.setHours(drawingHour, drawingMinute, 0, 0);
      
      console.log(`Today is a drawing day. Drawing time: ${todayDrawingTime.getHours()}:${todayDrawingTime.getMinutes()}`);
      console.log(`Current time: ${etNow.getHours()}:${etNow.getMinutes()}`);
      
      if (etNow <= todayDrawingTime) {
        // Drawing is today and hasn't happened yet
        nextDrawingDate = todayDrawingTime;
        found = true;
        console.log('✅ Next drawing is TODAY');
      } else {
        console.log('⏰ Today\'s drawing has already passed');
      }
    } else {
      console.log('Today is not a drawing day');
    }
    
    // If we haven't found today's drawing, look for the next drawing day
    if (!found) {
      let daysToAdd = 1;
      
      // Look ahead up to 7 days to find the next drawing day
      while (daysToAdd <= 7 && !found) {
        const checkDate = new Date(etNow);
        checkDate.setDate(etNow.getDate() + daysToAdd);
        checkDate.setHours(drawingHour, drawingMinute, 0, 0);
        
        const checkDay = checkDate.getDay();
        console.log(`Checking ${daysToAdd} days ahead: ${getDayName(checkDay)} (${checkDay})`);
        
        if (drawingDays.includes(checkDay)) {
          nextDrawingDate = checkDate;
          found = true;
          console.log(`✅ Next drawing found in ${daysToAdd} days: ${getDayName(checkDay)}`);
        }
        
        daysToAdd++;
      }
    }
    
    if (!found) {
      throw new Error('Could not find next drawing date within 7 days');
    }
    
    // Get day name for the next drawing
    const nextDrawingDayName = getDayName(nextDrawingDate.getDay());
    
    console.log('Final next drawing date (ET):', nextDrawingDate.toString());
    console.log('Next drawing day:', nextDrawingDayName);
    
    const result = {
      date: nextDrawingDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/New_York'
      }),
      time: '10:59 PM ET',
      dayOfWeek: nextDrawingDayName,
      timestamp: nextDrawingDate.toISOString()
    };
    
    console.log('=== Final Result ===');
    console.log('Date string:', result.date);
    console.log('Day of week:', result.dayOfWeek);
    console.log('Full timestamp:', result.timestamp);
    
    return result;
    
  } catch (error) {
    console.error('Next drawing calculation failed:', error.message);
    return {
      date: 'Check powerball.com',
      time: '10:59 PM ET',
      dayOfWeek: 'Mon/Wed/Sat',
      timestamp: null
    };
  }
}

// Helper function to get day name
function getDayName(dayNumber) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayNames[dayNumber] || 'Unknown';
}
