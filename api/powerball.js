// api/powerball.js - Vercel/Netlify Serverless Function
// This function scrapes real Powerball data and returns it as JSON

export default async function handler(req, res) {
  // Set CORS headers to allow your frontend to access this API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('Fetching live Powerball data...');
    
    // Multiple sources to try for real lottery data
    const dataSources = [
      {
        name: 'Powerball.com',
        url: 'https://www.powerball.com/',
        extractor: extractFromPowerballCom
      },
      {
        name: 'Texas Lottery',
        url: 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/index.html',
        extractor: extractFromTexasLottery
      },
      {
        name: 'Florida Lottery',
        url: 'https://www.flalottery.com/powerball',
        extractor: extractFromFloridaLottery
      }
    ];

    let jackpotData = null;
    let sourceUsed = null;

    // Try each data source until we get valid data
    for (const source of dataSources) {
      try {
        console.log(`Trying ${source.name}...`);
        
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const html = await response.text();
        jackpotData = source.extractor(html);
        
        if (jackpotData && jackpotData.amount > 0) {
          sourceUsed = source.name;
          console.log(`Success from ${source.name}: $${jackpotData.amount / 1000000}M`);
          break;
        }
      } catch (error) {
        console.log(`${source.name} failed:`, error.message);
        continue;
      }
    }

    if (!jackpotData) {
      return res.status(503).json({
        error: 'Unable to fetch current jackpot data',
        message: 'All data sources are currently unavailable'
      });
    }

    // Calculate next drawing date
    const nextDrawing = calculateNextDrawing();
    
    // Return the real jackpot data
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
      success: true
    };

    // Cache for 4 hours
    res.setHeader('Cache-Control', 's-maxage=14400, max-age=14400');
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch lottery data',
      success: false
    });
  }
}

// Extract jackpot from Powerball.com HTML
function extractFromPowerballCom(html) {
  const patterns = [
    /\$([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion)/gi,
    /jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion)/gi,
    /est\.?\s*jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*(?:million|billion)/gi
  ];

  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)];
    
    for (const match of matches) {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      
      if (match[0].toLowerCase().includes('billion')) {
        amount *= 1000;
      }
      amount *= 1000000; // Convert to actual dollars
      
      // Validate reasonable jackpot range
      if (amount >= 20000000 && amount <= 3000000000) {
        return {
          amount: amount,
          cashValue: Math.round(amount * 0.6) // Typical cash option is ~60%
        };
      }
    }
  }
  
  return null;
}

// Extract jackpot from Texas Lottery HTML
function extractFromTexasLottery(html) {
  const patterns = [
    /Est\.?\s*Annuitized\s*Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi,
    /Current\s*Est\.?\s*Annuitized\s*Jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*Million/gi
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, '')) * 1000000;
      
      if (amount >= 20000000 && amount <= 3000000000) {
        // Also try to extract cash value
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
  
  return null;
}

// Extract jackpot from Florida Lottery HTML
function extractFromFloridaLottery(html) {
  const patterns = [
    /\$([0-9,]+(?:\.[0-9]+)?)\s*million/gi,
    /jackpot[^$]*\$([0-9,]+(?:\.[0-9]+)?)\s*million/gi
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
  
  return null;
}

// Calculate next Powerball drawing (Mon, Wed, Sat at 10:59 PM ET)
function calculateNextDrawing() {
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
}
