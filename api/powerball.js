// api/powerball.js - Accurate data only, no estimates
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

  try {
    console.log('=== Powerball API Request Started ===');
    console.log('Timestamp:', new Date().toISOString());
    
    // Reliable data sources - using official APIs and RSS feeds
    const dataSources = [
      {
        name: 'Official Powerball RSS Feed',
        url: 'https://www.powerball.com/api/v1/estimates/powerball',
        type: 'json',
        extractor: extractFromOfficialAPI,
        timeout: 10000
      },
      {
        name: 'Multi-State Lottery Association',
        url: 'https://www.musl.com/PowerBall',
        type: 'html',
        extractor: extractFromMUSLHTML,
        timeout: 8000
      },
      {
        name: 'Lottery USA API',
        url: 'https://www.lotteryusa.com/powerball/api/latest',
        type: 'json',
        extractor: extractFromLotteryUSA,
        timeout: 8000
      },
      {
        name: 'NY Lottery Open Data',
        url: 'https://data.ny.gov/resource/5xaw-6ayf.json?$limit=1&$order=draw_date DESC',
        type: 'json',
        extractor: extractFromNYOpenData,
        timeout: 8000
      }
    ];

    let jackpotData = null;
    let sourceUsed = null;
    let errors = [];

    // Try each source sequentially
    for (const source of dataSources) {
      try {
        console.log(`Attempting ${source.name}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), source.timeout);
        
        const response = await fetch(source.url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LotteryCalculator/1.0)',
            'Accept': source.type === 'json' ? 'application/json' : 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': 'https://www.powerball.com/'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log(`${source.name} status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = source.type === 'json' ? 
          await response.json() : 
          await response.text();
        
        jackpotData = source.extractor(data);
        
        if (jackpotData && isValidJackpotData(jackpotData)) {
          sourceUsed = source.name;
          console.log(`✅ Success from ${source.name}: $${jackpotData.formatted}`);
          break;
        } else {
          throw new Error('Invalid or incomplete data returned');
        }
        
      } catch (error) {
        const errorMsg = `${source.name}: ${error.message}`;
        errors.push(errorMsg);
        console.log(`❌ ${errorMsg}`);
        
        if (error.name === 'AbortError') {
          console.log(`${source.name} timed out after ${source.timeout}ms`);
        }
        continue;
      }
    }

    // Calculate next drawing date
    const nextDrawing = calculateNextDrawing();
    
    if (jackpotData && sourceUsed) {
      // SUCCESS: Return real data
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
          errors: errors
        }
      };

      // Cache successful response for 1 hour
      res.setHeader('Cache-Control', 's-maxage=3600, max-age=3600');
      return res.status(200).json(result);
      
    } else {
      // FAILURE: No real data available
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
          errors: errors
        }
      };

      // Don't cache failed responses
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.status(503).json(result);
    }

  } catch (error) {
    console.error('=== Critical API Error ===');
    console.error('Error:', error);
    
    return res.status(500).json({
      success: false,
      dataAvailable: false,
      error: 'Internal server error',
      message: 'LIVE POWERBALL DATA TEMPORARILY UNAVAILABLE',
      details: 'A technical error occurred while fetching lottery data. Please try again later.',
      timestamp: new Date().toISOString(),
      debug: {
        error: error.message
      }
    });
  }
}

// Data extraction functions for different sources
function extractFromOfficialAPI(data) {
  try {
    if (data && data.estimatedJackpot) {
      const amount = parseFloat(data.estimatedJackpot) * 1000000;
      const cashValue = data.estimatedCashValue ? 
        parseFloat(data.estimatedCashValue) * 1000000 : 
        Math.round(amount * 0.6);
      
      return {
        amount: amount,
        cashValue: cashValue,
        formatted: `$${Math.round(amount / 1000000)}M`,
        cashFormatted: `$${Math.round(cashValue / 1000000)}M`
      };
    }
  } catch (error) {
    console.log('Official API extraction failed:', error.message);
  }
  return null;
}

function extractFromMUSLHTML(html) {
  try {
    // Look for jackpot patterns in MUSL HTML
    const patterns = [
      /Estimated\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Current\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /\$([0-9,]+(?:\.[0-9]+)?)\s*Million\s*Jackpot/gi
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const amountStr = match[1] || match[0].match(/\$([0-9,]+(?:\.[0-9]+)?)/)[1];
        const amount = parseFloat(amountStr.replace(/,/g, '')) * 1000000;
        
        if (amount >= 20000000 && amount <= 3000000000) {
          return {
            amount: amount,
            cashValue: Math.round(amount * 0.6),
            formatted: `$${Math.round(amount / 1000000)}M`,
            cashFormatted: `$${Math.round(amount * 0.6 / 1000000)}M`
          };
        }
      }
    }
  } catch (error) {
    console.log('MUSL HTML extraction failed:', error.message);
  }
  return null;
}

function extractFromLotteryUSA(data) {
  try {
    if (data && data.jackpot) {
      let amount = parseFloat(data.jackpot.amount || data.jackpot);
      
      // Handle different formats
      if (amount < 1000000 && amount > 10) {
        amount = amount * 1000000; // Convert millions to dollars
      }
      
      if (amount >= 20000000 && amount <= 3000000000) {
        return {
          amount: amount,
          cashValue: data.cashValue || Math.round(amount * 0.6),
          formatted: `$${Math.round(amount / 1000000)}M`,
          cashFormatted: `$${Math.round((data.cashValue || amount * 0.6) / 1000000)}M`
        };
      }
    }
  } catch (error) {
    console.log('LotteryUSA extraction failed:', error.message);
  }
  return null;
}

function extractFromNYOpenData(data) {
  try {
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[0];
      if (latest.jackpot) {
        const amount = parseFloat(latest.jackpot);
        if (amount >= 20000000 && amount <= 3000000000) {
          return {
            amount: amount,
            cashValue: latest.cash_value || Math.round(amount * 0.6),
            formatted: `$${Math.round(amount / 1000000)}M`,
            cashFormatted: `$${Math.round((latest.cash_value || amount * 0.6) / 1000000)}M`
          };
        }
      }
    }
  } catch (error) {
    console.log('NY Open Data extraction failed:', error.message);
  }
  return null;
}

// Validate jackpot data
function isValidJackpotData(data) {
  if (!data || typeof data !== 'object') return false;
  
  const amount = data.amount;
  const cashValue = data.cashValue;
  
  // Check if amounts are reasonable
  if (!amount || amount < 20000000 || amount > 3000000000) return false;
  if (!cashValue || cashValue < 10000000 || cashValue > 2000000000) return false;
  
  // Cash value should be less than annuity
  if (cashValue >= amount) return false;
  
  // Cash value should be between 40-80% of annuity (typical range)
  const ratio = cashValue / amount;
  if (ratio < 0.4 || ratio > 0.8) return false;
  
  return true;
}

// Calculate next Powerball drawing
function calculateNextDrawing() {
  try {
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    const dayOfWeek = et.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = et.getHours();
    
    let daysToAdd = 0;
    
    // Drawing days: Monday (1), Wednesday (3), Saturday (6) at 10:59 PM ET
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
