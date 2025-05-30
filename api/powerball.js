// api/powerball.js - Fixed Vercel Serverless Function
// This function fetches real Powerball data with enhanced error handling

export default async function handler(req, res) {
  // Enhanced CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are supported',
      success: false
    });
  }

  try {
    console.log('=== Powerball API Request Started ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    // Multiple data sources with improved reliability
    const dataSources = [
      {
        name: 'Powerball Official',
        url: 'https://www.powerball.com/api/v1/estimates/powerball',
        type: 'json',
        extractor: extractFromPowerballAPI
      },
      {
        name: 'Powerball.com',
        url: 'https://www.powerball.com/',
        type: 'html',
        extractor: extractFromPowerballCom
      },
      {
        name: 'Multi-State Lottery',
        url: 'https://www.musl.com/powerball',
        type: 'html', 
        extractor: extractFromMUSL
      },
      {
        name: 'Texas Lottery',
        url: 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/index.html',
        type: 'html',
        extractor: extractFromTexasLottery
      }
    ];

    let jackpotData = null;
    let sourceUsed = null;
    let lastError = null;

    // Try each data source sequentially
    for (const source of dataSources) {
      try {
        console.log(`Attempting to fetch from ${source.name}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': source.type === 'json' ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log(`${source.name} response status:`, response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = source.type === 'json' ? 
          await response.json() : 
          await response.text();
        
        console.log(`${source.name} data length:`, typeof data === 'string' ? data.length : 'JSON object');
        
        jackpotData = source.extractor(data);
        
        if (jackpotData && jackpotData.amount > 0) {
          sourceUsed = source.name;
          console.log(`✅ Success from ${source.name}: $${Math.round(jackpotData.amount / 1000000)}M`);
          break;
        } else {
          console.log(`❌ ${source.name} returned invalid data:`, jackpotData);
        }
        
      } catch (error) {
        lastError = error;
        console.log(`❌ ${source.name} failed:`, error.message);
        
        if (error.name === 'AbortError') {
          console.log(`${source.name} timed out after 8 seconds`);
        }
        continue;
      }
    }

    // If no real data found, return fallback
    if (!jackpotData) {
      console.log('All sources failed, using fallback data');
      jackpotData = {
        amount: 735000000, // $735M estimated
        cashValue: 441000000, // ~60% cash option
        source: 'Estimated (APIs Unavailable)'
      };
      sourceUsed = 'Fallback Data';
    }

    // Calculate next drawing date
    const nextDrawing = calculateNextDrawing();
    
    // Prepare response
    const result = {
      jackpot: {
        amount: jackpotData.amount,
        cashValue: jackpotData.cashValue,
        formatted: `$${Math.round(jackpotData.amount / 1000000)}M`,
        cashFormatted: `$${Math.round(jackpotData.cashValue / 1000000)}M`
      },
      nextDrawing: nextDrawing,
      source: sourceUsed,
      lastUpdated: new Date().toISOString(),
      success: true,
      timestamp: new Date().toISOString(),
      debug: {
        sourcesAttempted: dataSources.length,
        lastError: lastError ? lastError.message : null
      }
    };

    console.log('=== API Response ===');
    console.log(JSON.stringify(result, null, 2));

    // Cache for 4 hours
    res.setHeader('Cache-Control', 's-maxage=14400, max-age=14400');
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('=== API Error ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch lottery data',
      success: false,
      timestamp: new Date().toISOString(),
      debug: {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
}

// Extract from official Powerball JSON API (if available)
function extractFromPowerballAPI(data) {
  try {
    if (data && data.estimatedJackpot) {
      const amount = parseFloat(data.estimatedJackpot) * 1000000;
      return {
        amount: amount,
        cashValue: data.estimatedCashValue ? parseFloat(data.estimatedCashValue) * 1000000 : Math.round(amount * 0.6)
      };
    }
  } catch (error) {
    console.log('Powerball API extraction failed:', error.message);
  }
  return null;
}

// Extract jackpot from Powerball.com HTML
function extractFromPowerballCom(html) {
  try {
    const patterns = [
      /\$([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion)/gi,
      /jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion)/gi,
      /est\.?\s*jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion)/gi,
      /estimated[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion)/gi
    ];

    for (const pattern of patterns) {
      const matches = [...html.matchAll(pattern)];
      
      for (const match of matches) {
        let amount = parseFloat(match[1].replace(/,/g, ''));
        
        if (match[0].toLowerCase().includes('billion')) {
          amount *= 1000;
        }
        amount *= 1000000; // Convert to actual dollars
        
        // Validate reasonable jackpot range ($20M - $3B)
        if (amount >= 20000000 && amount <= 3000000000) {
          console.log(`Found jackpot: $${amount} from pattern: ${pattern}`);
          return {
            amount: amount,
            cashValue: Math.round(amount * 0.6) // Typical cash option is ~60%
          };
        }
      }
    }
  } catch (error) {
    console.log('Powerball.com extraction failed:', error.message);
  }
  
  return null;
}

// Extract from Multi-State Lottery Association
function extractFromMUSL(html) {
  try {
    const patterns = [
      /\$([0-9,]+(?:\.[0-9]+)?)\s*million/gi,
      /powerball[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*million/gi
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, '')) * 1000000;
        
        if (amount >= 20000000 && amount <= 3000000000) {
          return {
            amount: amount,
            cashValue: Math.round(amount * 0.6)
          };
        }
      }
    }
  } catch (error) {
    console.log('MUSL extraction failed:', error.message);
  }
  
  return null;
}

// Extract jackpot from Texas Lottery HTML
function extractFromTexasLottery(html) {
  try {
    const patterns = [
      /Est\.?\s*Annuitized\s*Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Current\s*Est\.?\s*Annuitized\s*Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Estimated\s*Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, '')) * 1000000;
        
        if (amount >= 20000000 && amount <= 3000000000) {
          // Try to extract cash value too
          const cashPattern = /Est\.?\s*Cash\s*Value[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi;
          const cashMatch = html.match(cashPattern);
          const cashValue = cashMatch ? 
            parseFloat(cashMatch[1].replace(/,/g, '')) * 1000000 : 
            Math.round(amount * 0.6);
          
          return {
            amount: amount,
            cashValue: cashValue
          };
        }
      }
    }
  } catch (error) {
    console.log('Texas Lottery extraction failed:', error.message);
  }
  
  return null;
}

// Calculate next Powerball drawing (Mon, Wed, Sat at 10:59 PM ET)
function calculateNextDrawing() {
  try {
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    const dayOfWeek = et.getDay();
    const hour = et.getHours();
    
    let daysToAdd = 0;
    
    // Drawing days: Monday (1), Wednesday (3), Saturday (6)
    if (dayOfWeek === 0) { // Sunday
      daysToAdd = 1; // Next Monday
    } else if (dayOfWeek === 1) { // Monday
      daysToAdd = (hour >= 23) ? 2 : 0; // Wed if after drawing, today if before
    } else if (dayOfWeek === 2) { // Tuesday
      daysToAdd = 1; // Next Wednesday
    } else if (dayOfWeek === 3) { // Wednesday
      daysToAdd = (hour >= 23) ? 3 : 0; // Sat if after drawing, today if before
    } else if (dayOfWeek === 4 || dayOfWeek === 5) { // Thu/Fri
      daysToAdd = 6 - dayOfWeek; // Next Saturday
    } else if (dayOfWeek === 6) { // Saturday
      daysToAdd = (hour >= 23) ? 2 : 0; // Mon if after drawing, today if before
    }
    
    const nextDraw = new Date(et);
    nextDraw.setDate(et.getDate() + daysToAdd);
    
    return {
      date: nextDraw.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        timeZone: 'America/New_York'
      }),
      time: '10:59 PM ET'
    };
  } catch (error) {
    console.log('Next drawing calculation failed:', error.message);
    return {
      date: 'TBD',
      time: '10:59 PM ET'
    };
  }
}
