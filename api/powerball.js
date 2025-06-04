// api/powerball.js - Fixed source tracking issue
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

  // Enhanced data sources that can provide both jackpot AND latest numbers
  const dataSources = [
    {
      name: 'NY State Open Data API',
      url: 'https://data.ny.gov/resource/d6yy-54nr.json?$order=draw_date%20DESC&$limit=3',
      extractor: extractFromNYState,
      timeout: 15000,
      priority: 1,
      providesNumbers: true
    },
    {
      name: 'NY State History API',
      url: 'https://data.ny.gov/resource/dhwa-m6y4.json?$order=date%20DESC&$limit=3',
      extractor: extractFromNYStateHistory,
      timeout: 15000,
      priority: 2,
      providesNumbers: true
    },
    {
      name: 'Lottery API Hub',
      url: 'https://api.lottery-hub.com/v1/powerball/latest',
      extractor: extractFromLotteryHub,
      timeout: 12000,
      priority: 3,
      providesNumbers: false
    },
    {
      name: 'Texas Lottery Scraper',
      url: 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/',
      extractor: extractFromTexasHTML,
      timeout: 10000,
      priority: 4,
      providesNumbers: false
    },
    {
      name: 'California Lottery Scraper',
      url: 'https://www.calottery.com/en/draw-games/powerball',
      extractor: extractFromCaliforniaHTML,
      timeout: 10000,
      priority: 5,
      providesNumbers: false
    },
    {
      name: 'Official Powerball Results',
      url: 'https://www.powerball.com/previous-results',
      extractor: extractFromPowerballResults,
      timeout: 8000,
      priority: 6,
      providesNumbers: true
    }
  ];

  let jackpotData = null;
  let latestNumbers = null;
  let jackpotSource = null;  // Fixed: separate variables for each source
  let numbersSource = null;
  let detailedErrors = [];

  // Try to get both jackpot and latest numbers
  for (const source of dataSources) {
    if (jackpotData && latestNumbers) break; // We have everything we need
    
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
      
      // Extract data
      console.log('Extracting data...');
      const extractedData = source.extractor(data);
      
      // Check for jackpot data
      if (!jackpotData && extractedData.jackpot && isValidJackpotData(extractedData.jackpot)) {
        jackpotData = extractedData.jackpot;
        jackpotSource = source.name;  // Fixed: use separate variable
        console.log(`✅ Jackpot SUCCESS from ${source.name}: ${jackpotData.formatted}`);
      }
      
      // Check for latest numbers
      if (!latestNumbers && extractedData.latestNumbers && isValidLatestNumbers(extractedData.latestNumbers)) {
        latestNumbers = extractedData.latestNumbers;
        numbersSource = source.name;
        console.log(`✅ Numbers SUCCESS from ${source.name}: ${latestNumbers.numbers.join(', ')} | PB: ${latestNumbers.powerball}`);
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
  
  // Prepare response with proper source handling
  const result = {
    success: jackpotData !== null || latestNumbers !== null,
    dataAvailable: jackpotData !== null,
    numbersAvailable: latestNumbers !== null,
    jackpot: jackpotData,
    latestNumbers: latestNumbers,
    nextDrawing: nextDrawing,
    source: jackpotSource || numbersSource || 'No sources available',  // Fixed: fallback logic
    sources: {
      jackpot: jackpotSource || 'Not available',
      numbers: numbersSource || 'Not available'
    },
    lastUpdated: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    debug: {
      sourcesAttempted: dataSources.length,
      errors: detailedErrors,
      successfulSources: {
        jackpot: jackpotSource,
        numbers: numbersSource
      }
    }
  };

  if (!jackpotData && !latestNumbers) {
    // COMPLETE FAILURE
    result.success = false;
    result.dataAvailable = false;
    result.numbersAvailable = false;
    result.message = 'LIVE POWERBALL DATA TEMPORARILY UNAVAILABLE';
    result.details = 'Unable to retrieve current jackpot or latest numbers from official sources.';
    result.source = 'No sources available';
    
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(503).json(result);
    
  } else {
    // PARTIAL OR COMPLETE SUCCESS
    if (!jackpotData) {
      result.message = 'Latest numbers available, but jackpot data unavailable';
    } else if (!latestNumbers) {
      result.message = 'Jackpot data available, but latest numbers unavailable';
    }
    
    res.setHeader('Cache-Control', 's-maxage=1800, max-age=1800'); // 30 minutes cache
    return res.status(200).json(result);
  }
}

// Enhanced extraction functions that extract both jackpot AND latest numbers

function extractFromNYState(data) {
  const result = { jackpot: null, latestNumbers: null };
  
  try {
    console.log('NY State extractor - processing data...');
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log('NY State: No array data or empty array');
      return result;
    }
    
    console.log(`NY State: Processing ${data.length} records`);
    const latest = data[0];
    console.log('Latest record:', latest);
    
    // Extract jackpot
    if (latest && latest.jackpot) {
      const jackpotStr = latest.jackpot.toString().replace(/[$,]/g, '');
      const amount = parseFloat(jackpotStr);
      
      if (amount >= 20000000 && amount <= 5000000000) {
        const cashValue = latest.cash_value ? 
          parseFloat(latest.cash_value.toString().replace(/[$,]/g, '')) : 
          Math.round(amount * 0.6);
        
        result.jackpot = {
          amount: amount,
          cashValue: cashValue,
          formatted: formatJackpot(amount),
          cashFormatted: formatJackpot(cashValue)
        };
      }
    }
    
    // Extract latest numbers
    if (latest && latest.winning_numbers && latest.draw_date) {
      const numberParts = latest.winning_numbers.trim().split(/\s+/);
      
      if (numberParts.length >= 6) {
        const numbers = numberParts.slice(0, 5).map(n => parseInt(n));
        const powerball = parseInt(numberParts[5]);
        
        if (isValidPowerballNumbers(numbers, powerball)) {
          result.latestNumbers = {
            numbers: numbers.sort((a, b) => a - b),
            powerball: powerball,
            drawDate: latest.draw_date.split('T')[0],
            formatted: `${numbers.sort((a, b) => a - b).join(', ')} | PB: ${powerball}`,
            multiplier: latest.multiplier || null
          };
        }
      }
    }
    
    return result;
    
  } catch (error) {
    console.log('NY State extraction error:', error.message);
    return result;
  }
}

function extractFromNYStateHistory(data) {
  const result = { jackpot: null, latestNumbers: null };
  
  try {
    console.log('NY State History extractor - processing data...');
    
    if (!Array.isArray(data) || data.length === 0) {
      return result;
    }
    
    const latest = data[0];
    console.log('NY History latest record:', latest);
    
    // Extract latest numbers
    if (latest && latest.white_balls && latest.powerball && latest.date) {
      let numbers = [];
      
      if (Array.isArray(latest.white_balls)) {
        numbers = latest.white_balls.map(n => parseInt(n));
      } else if (typeof latest.white_balls === 'string') {
        numbers = latest.white_balls.split(/[,\s]+/).map(n => parseInt(n.trim()));
      }
      
      const powerball = parseInt(latest.powerball);
      
      if (isValidPowerballNumbers(numbers, powerball)) {
        result.latestNumbers = {
          numbers: numbers.sort((a, b) => a - b),
          powerball: powerball,
          drawDate: latest.date.split('T')[0],
          formatted: `${numbers.sort((a, b) => a - b).join(', ')} | PB: ${powerball}`
        };
      }
    }
    
    // Try to extract jackpot if available
    if (latest && latest.jackpot) {
      const amount = parseFloat(latest.jackpot.toString().replace(/[$,]/g, ''));
      if (amount >= 20000000 && amount <= 5000000000) {
        result.jackpot = {
          amount: amount,
          cashValue: Math.round(amount * 0.6),
          formatted: formatJackpot(amount),
          cashFormatted: formatJackpot(amount * 0.6)
        };
      }
    }
    
    return result;
    
  } catch (error) {
    console.log('NY State History extraction error:', error.message);
    return result;
  }
}

function extractFromLotteryHub(data) {
  const result = { jackpot: null, latestNumbers: null };
  
  try {
    console.log('Lottery Hub extractor - processing data...');
    
    if (data && typeof data === 'object') {
      // Extract jackpot
      let amount = 0;
      let cashValue = 0;
      
      if (data.jackpot) amount = parseFloat(data.jackpot.toString().replace(/[$,]/g, ''));
      else if (data.amount) amount = parseFloat(data.amount.toString().replace(/[$,]/g, ''));
      else if (data.prize) amount = parseFloat(data.prize.toString().replace(/[$,]/g, ''));
      
      if (data.cash_value) cashValue = parseFloat(data.cash_value.toString().replace(/[$,]/g, ''));
      else if (data.cashValue) cashValue = parseFloat(data.cashValue.toString().replace(/[$,]/g, ''));
      else if (amount > 0) cashValue = Math.round(amount * 0.6);
      
      if (amount >= 20000000 && amount <= 5000000000) {
        result.jackpot = {
          amount: amount,
          cashValue: cashValue,
          formatted: formatJackpot(amount),
          cashFormatted: formatJackpot(cashValue)
        };
      }
      
      // Extract latest numbers if available
      if (data.numbers && data.powerball) {
        const numbers = Array.isArray(data.numbers) ? data.numbers.map(n => parseInt(n)) : [];
        const powerball = parseInt(data.powerball);
        
        if (isValidPowerballNumbers(numbers, powerball)) {
          result.latestNumbers = {
            numbers: numbers.sort((a, b) => a - b),
            powerball: powerball,
            drawDate: data.date || 'Unknown',
            formatted: `${numbers.sort((a, b) => a - b).join(', ')} | PB: ${powerball}`
          };
        }
      }
    }
    
    return result;
    
  } catch (error) {
    console.log('Lottery Hub extraction error:', error.message);
    return result;
  }
}

function extractFromTexasHTML(html) {
  const result = { jackpot: null, latestNumbers: null };
  
  try {
    console.log('Texas HTML extractor - processing...');
    
    // Extract jackpot (existing logic)
    const jackpotPatterns = [
      /Current\s+Est\.\s+Annuitized\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Est\.\s+Annuitized\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi
    ];

    for (const pattern of jackpotPatterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        for (const match of matches) {
          const amountStr = match[1].replace(/,/g, '');
          const amount = parseFloat(amountStr) * 1000000;
          
          if (amount >= 20000000 && amount <= 5000000000) {
            result.jackpot = {
              amount: amount,
              cashValue: Math.round(amount * 0.6),
              formatted: formatJackpot(amount),
              cashFormatted: formatJackpot(amount * 0.6)
            };
            break;
          }
        }
        if (result.jackpot) break;
      }
    }
    
    // Extract latest numbers
    const numberPatterns = [
      /(\d{2}\/\d{2}\/\d{4})[^0-9]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})/g,
      /Latest.*?(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*PB:\s*(\d{1,2})/gi
    ];
    
    for (const pattern of numberPatterns) {
      const match = pattern.exec(html);
      if (match) {
        try {
          let numbers, powerball, drawDate;
          
          if (match.length >= 8) {
            // First pattern with date
            drawDate = match[1];
            numbers = [parseInt(match[2]), parseInt(match[3]), parseInt(match[4]), parseInt(match[5]), parseInt(match[6])];
            powerball = parseInt(match[7]);
          } else if (match.length >= 7) {
            // Second pattern without date
            numbers = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseInt(match[4]), parseInt(match[5])];
            powerball = parseInt(match[6]);
            drawDate = 'Recent';
          }
          
          if (isValidPowerballNumbers(numbers, powerball)) {
            result.latestNumbers = {
              numbers: numbers.sort((a, b) => a - b),
              powerball: powerball,
              drawDate: drawDate || 'Unknown',
              formatted: `${numbers.sort((a, b) => a - b).join(', ')} | PB: ${powerball}`
            };
            break;
          }
        } catch (err) {
          console.log('Error parsing Texas numbers:', err.message);
        }
      }
    }
    
    return result;
    
  } catch (error) {
    console.log('Texas HTML extraction error:', error.message);
    return result;
  }
}

function extractFromCaliforniaHTML(html) {
  const result = { jackpot: null, latestNumbers: null };
  
  try {
    // Extract jackpot (existing logic)
    const jackpotPatterns = [
      /Estimated\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Next\s+Drawing[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Powerball.*?\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi
    ];

    for (const pattern of jackpotPatterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        for (const match of matches) {
          const amountStr = match[1].replace(/,/g, '');
          const amount = parseFloat(amountStr) * 1000000;
          
          if (amount >= 20000000 && amount <= 5000000000) {
            result.jackpot = {
              amount: amount,
              cashValue: Math.round(amount * 0.6),
              formatted: formatJackpot(amount),
              cashFormatted: formatJackpot(amount * 0.6)
            };
            break;
          }
        }
        if (result.jackpot) break;
      }
    }
    
    return result;
    
  } catch (error) {
    console.log('California HTML extraction error:', error.message);
    return result;
  }
}

function extractFromPowerballResults(html) {
  const result = { jackpot: null, latestNumbers: null };
  
  try {
    console.log('Official Powerball Results extractor - processing...');
    
    // Extract latest numbers from official results
    const numberPatterns = [
      /(\d{2}\/\d{2}\/\d{4})[^0-9]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})/g,
      /latest.*?(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*powerball[^\d]*(\d{1,2})/gi
    ];
    
    for (const pattern of numberPatterns) {
      const match = pattern.exec(html);
      if (match) {
        try {
          let numbers, powerball, drawDate;
          
          if (match.length >= 8) {
            drawDate = match[1];
            numbers = [parseInt(match[2]), parseInt(match[3]), parseInt(match[4]), parseInt(match[5]), parseInt(match[6])];
            powerball = parseInt(match[7]);
          } else if (match.length >= 7) {
            numbers = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseInt(match[4]), parseInt(match[5])];
            powerball = parseInt(match[6]);
            drawDate = 'Recent';
          }
          
          if (isValidPowerballNumbers(numbers, powerball)) {
            result.latestNumbers = {
              numbers: numbers.sort((a, b) => a - b),
              powerball: powerball,
              drawDate: drawDate || 'Unknown',
              formatted: `${numbers.sort((a, b) => a - b).join(', ')} | PB: ${powerball}`
            };
            break;
          }
        } catch (err) {
          console.log('Error parsing official Powerball numbers:', err.message);
        }
      }
    }
    
    return result;
    
  } catch (error) {
    console.log('Official Powerball results extraction error:', error.message);
    return result;
  }
}

// Validation functions
function isValidJackpotData(data) {
  if (!data || typeof data !== 'object') return false;
  
  const amount = data.amount;
  const cashValue = data.cashValue;
  
  if (!amount || amount < 20000000 || amount > 5000000000) return false;
  if (!cashValue || cashValue < 10000000 || cashValue > 3000000000) return false;
  if (cashValue >= amount) return false;
  
  const ratio = cashValue / amount;
  if (ratio < 0.4 || ratio > 0.8) return false;
  
  return true;
}

function isValidLatestNumbers(data) {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.numbers) || data.numbers.length !== 5) return false;
  if (!data.powerball || data.powerball < 1 || data.powerball > 26) return false;
  
  return isValidPowerballNumbers(data.numbers, data.powerball);
}

function isValidPowerballNumbers(numbers, powerball) {
  if (!Array.isArray(numbers) || numbers.length !== 5) return false;
  if (!powerball || powerball < 1 || powerball > 26) return false;
  
  for (const num of numbers) {
    if (!num || num < 1 || num > 69) return false;
  }
  
  const uniqueNumbers = new Set(numbers);
  if (uniqueNumbers.size !== 5) return false;
  
  return true;
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

// FIXED: Next drawing calculation (same as before)
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
      timestamp: nextDrawingDate.toISOString()
    };
    
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
