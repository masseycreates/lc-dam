// api/powerball.js - Updated with working data sources for 2025
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
    
    // Updated reliable data sources for 2025
    const dataSources = [
      {
        name: 'New York State Open Data API',
        url: 'https://data.ny.gov/resource/d6yy-54nr.json?$order=draw_date%20DESC&$limit=5&$where=draw_date%20%3E%20%272025-01-01%27',
        type: 'json',
        extractor: extractFromNYStateAPI,
        timeout: 12000
      },
      {
        name: 'Magayo Lottery API',
        url: 'https://www.magayo.com/api/jackpot.php?api_key=hXJDjsp8I6RY&game=us_powerball',
        type: 'json',
        extractor: extractFromMagayoAPI,
        timeout: 10000
      },
      {
        name: 'Texas Lottery Data',
        url: 'https://www.txlottery.org/export/sites/lottery/Games/Powerball/Winning_Numbers/',
        type: 'html',
        extractor: extractFromTexasLotteryHTML,
        timeout: 10000
      },
      {
        name: 'Florida Lottery Web Data',
        url: 'https://floridalottery.com/games/draw-games/powerball',
        type: 'html',
        extractor: extractFromFloridaLotteryHTML,
        timeout: 10000
      },
      {
        name: 'California Lottery Data',
        url: 'https://www.calottery.com/en/draw-games/powerball',
        type: 'html',
        extractor: extractFromCaliforniaLotteryHTML,
        timeout: 10000
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': source.type === 'json' ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
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

// NEW: Extract from NY State API (most reliable source)
function extractFromNYStateAPI(data) {
  try {
    if (Array.isArray(data) && data.length > 0) {
      // Get the most recent drawing
      const latest = data[0];
      
      // Extract jackpot amount from the most recent entry
      if (latest.jackpot) {
        const amount = parseFloat(latest.jackpot);
        if (amount >= 20000000 && amount <= 5000000000) {
          const cashValue = latest.cash_value ? 
            parseFloat(latest.cash_value) : 
            Math.round(amount * 0.6);
          
          return {
            amount: amount,
            cashValue: cashValue,
            formatted: `$${Math.round(amount / 1000000)}M`,
            cashFormatted: `$${Math.round(cashValue / 1000000)}M`,
            drawDate: latest.draw_date,
            winningNumbers: latest.winning_numbers
          };
        }
      }
    }
  } catch (error) {
    console.log('NY State API extraction failed:', error.message);
  }
  return null;
}

// NEW: Extract from Magayo API (free tier available)
function extractFromMagayoAPI(data) {
  try {
    if (data && data.status === 'success' && data.jackpot) {
      const jackpotStr = data.jackpot.replace(/[^\d.]/g, ''); // Remove currency symbols
      const amount = parseFloat(jackpotStr) * 1000000; // Convert millions to dollars
      
      if (amount >= 20000000 && amount <= 5000000000) {
        return {
          amount: amount,
          cashValue: Math.round(amount * 0.6), // Estimate cash value
          formatted: `$${Math.round(amount / 1000000)}M`,
          cashFormatted: `$${Math.round(amount * 0.6 / 1000000)}M`
        };
      }
    }
  } catch (error) {
    console.log('Magayo API extraction failed:', error.message);
  }
  return null;
}

// NEW: Extract from Texas Lottery HTML
function extractFromTexasLotteryHTML(html) {
  try {
    // Look for jackpot patterns in Texas HTML
    const patterns = [
      /Current\s+Est\.\s+Annuitized\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Est\.\s+Annuitized\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /\$([0-9,]+(?:\.[0-9]+)?)\s*Million[^$]*Jackpot/gi
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const amountStr = match[1] || match[0].match(/\$([0-9,]+(?:\.[0-9]+)?)/)[1];
        const amount = parseFloat(amountStr.replace(/,/g, '')) * 1000000;
        
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
  } catch (error) {
    console.log('Texas Lottery HTML extraction failed:', error.message);
  }
  return null;
}

// NEW: Extract from Florida Lottery HTML
function extractFromFloridaLotteryHTML(html) {
  try {
    // Multiple patterns for Florida lottery
    const patterns = [
      /Estimated\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Current\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /\$([0-9,]+(?:\.[0-9]+)?)\s*Million\s*Estimated/gi,
      /"jackpot"[^"]*"([0-9,]+(?:\.[0-9]+)?)[^"]*Million"/gi
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const amountStr = match[1] || match[0].match(/([0-9,]+(?:\.[0-9]+)?)/)[1];
        const amount = parseFloat(amountStr.replace(/,/g, '')) * 1000000;
        
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
  } catch (error) {
    console.log('Florida Lottery HTML extraction failed:', error.message);
  }
  return null;
}

// NEW: Extract from California Lottery HTML
function extractFromCaliforniaLotteryHTML(html) {
  try {
    // California-specific patterns
    const patterns = [
      /Estimated\s+Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /Next\s+Drawing[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
      /"estimated_jackpot"[^"]*"([0-9,]+(?:\.[0-9]+)?)"/gi
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const amountStr = match[1] || match[0].match(/([0-9,]+(?:\.[0-9]+)?)/)[1];
        const amount = parseFloat(amountStr.replace(/,/g, '')) * 1000000;
        
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
  } catch (error) {
    console.log('California Lottery HTML extraction failed:', error.message);
  }
  return null;
}

// Validate jackpot data (updated ranges)
function isValidJackpotData(data) {
  if (!data || typeof data !== 'object') return false;
  
  const amount = data.amount;
  const cashValue = data.cashValue;
  
  // Updated validation ranges for 2025
  if (!amount || amount < 20000000 || amount > 5000000000) return false;
  if (!cashValue || cashValue < 10000000 || cashValue > 3000000000) return false;
  
  // Cash value should be less than annuity
  if (cashValue >= amount) return false;
  
  // Cash value should be between 40-80% of annuity (typical range)
  const ratio = cashValue / amount;
  if (ratio < 0.4 || ratio > 0.8) return false;
  
  return true;
}

// Calculate next Powerball drawing (updated for 2025 schedule)
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
