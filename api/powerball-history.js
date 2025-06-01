// api/powerball-history.js - Accurate historical data only, no estimates
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
    const requestedLimit = parseInt(req.query.limit) || 150;
    const limit = Math.min(Math.max(requestedLimit, 25), 500);
    
    console.log(`=== Historical API Request Started (${limit} drawings) ===`);
    console.log('Timestamp:', new Date().toISOString());
    
    // Reliable historical data sources
    const historicalSources = [
      {
        name: 'NY State Open Data Portal',
        url: `https://data.ny.gov/resource/d6yy-54nr.json?$order=draw_date%20DESC&$limit=${Math.min(limit * 1.2, 600)}`,
        type: 'json',
        extractor: extractFromNYStateAPI,
        timeout: 15000
      },
      {
        name: 'Multi-State Lottery Data Feed',
        url: 'https://www.musl.com/data/powerball/history.json',
        type: 'json',
        extractor: extractFromMUSLData,
        timeout: 12000
      },
      {
        name: 'Official Powerball Archive',
        url: 'https://www.powerball.com/previous-results',
        type: 'html',
        extractor: extractFromPowerballArchive,
        timeout: 10000
      },
      {
        name: 'Lottery Post Historical API',
        url: `https://www.lotterypost.com/api/powerball/results?limit=${limit}`,
        type: 'json',
        extractor: extractFromLotteryPost,
        timeout: 10000
      }
    ];

    let historicalData = [];
    let sourceUsed = null;
    let errors = [];

    // Try each source sequentially
    for (const source of historicalSources) {
      try {
        console.log(`Attempting ${source.name}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), source.timeout);
        
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LotteryCalculator/1.0)',
            'Accept': source.type === 'json' ? 'application/json' : 'text/html',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
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
        
        const extractedData = source.extractor(data, limit);
        
        if (extractedData && extractedData.length > 0 && validateHistoricalData(extractedData)) {
          historicalData = extractedData;
          sourceUsed = source.name;
          console.log(`✅ Success from ${source.name}: ${extractedData.length} valid drawings`);
          break;
        } else {
          throw new Error('No valid historical data returned');
        }
        
      } catch (error) {
        const errorMsg = `${source.name}: ${error.message}`;
        errors.push(errorMsg);
        console.log(`❌ ${errorMsg}`);
        continue;
      }
    }

    if (historicalData.length === 0) {
      // FAILURE: No real historical data available
      return res.status(503).json({
        success: false,
        dataAvailable: false,
        message: 'HISTORICAL POWERBALL DATA TEMPORARILY UNAVAILABLE',
        details: 'Unable to retrieve historical drawing data from official sources. Number optimization features are disabled.',
        lastAttempted: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        debug: {
          sourcesAttempted: historicalSources.length,
          errors: errors
        }
      });
    }

    // Sort and limit data
    const sortedData = historicalData
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);

    // Calculate statistics only from real data
    const statistics = calculateFrequencyStats(sortedData);
    
    const result = {
      success: true,
      dataAvailable: true,
      drawings: sortedData,
      statistics: statistics,
      meta: {
        totalDrawings: sortedData.length,
        requestedLimit: requestedLimit,
        actualLimit: limit,
        dateRange: {
          latest: sortedData[0]?.date || null,
          earliest: sortedData[sortedData.length - 1]?.date || null
        },
        source: sourceUsed,
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      debug: {
        sourcesAttempted: historicalSources.length,
        errors: errors
      }
    };

    // Cache for 6 hours (historical data doesn't change often)
    res.setHeader('Cache-Control', 's-maxage=21600, max-age=21600');
    return res.status(200).json(result);

  } catch (error) {
    console.error('=== Historical API Error ===');
    console.error('Error:', error);
    
    return res.status(500).json({
      success: false,
      dataAvailable: false,
      error: 'Internal server error',
      message: 'HISTORICAL POWERBALL DATA TEMPORARILY UNAVAILABLE',
      details: 'A technical error occurred while fetching historical data.',
      timestamp: new Date().toISOString(),
      debug: {
        error: error.message
      }
    });
  }
}

// Extract from NY State Open Data API
function extractFromNYStateAPI(data, maxRecords = 500) {
  try {
    const drawings = [];
    
    if (Array.isArray(data)) {
      data.forEach((drawing) => {
        if (drawings.length >= maxRecords) return;
        
        try {
          const date = drawing.draw_date ? drawing.draw_date.split('T')[0] : null;
          const winningNumbers = drawing.winning_numbers;
          
          if (date && winningNumbers) {
            const numberParts = winningNumbers.trim().split(/\s+/);
            
            if (numberParts.length >= 6) {
              const numbers = numberParts.slice(0, 5).map(n => parseInt(n));
              const powerball = parseInt(numberParts[5]);
              
              if (isValidPowerballNumbers(numbers, powerball)) {
                drawings.push({
                  date: date,
                  numbers: numbers.sort((a, b) => a - b),
                  powerball: powerball,
                  jackpot: drawing.jackpot ? parseInt(drawing.jackpot) : null,
                  source: 'NY State Open Data'
                });
              }
            }
          }
        } catch (err) {
          console.log('Error parsing NY State drawing:', err.message);
        }
      });
    }
    
    return drawings;
    
  } catch (error) {
    console.log('NY State API extraction failed:', error.message);
    return [];
  }
}

// Extract from MUSL data feed
function extractFromMUSLData(data, maxRecords = 500) {
  try {
    const drawings = [];
    
    if (data && data.results && Array.isArray(data.results)) {
      data.results.forEach((drawing) => {
        if (drawings.length >= maxRecords) return;
        
        try {
          if (drawing.date && drawing.numbers && drawing.powerball) {
            const numbers = drawing.numbers.map(n => parseInt(n));
            const powerball = parseInt(drawing.powerball);
            
            if (isValidPowerballNumbers(numbers, powerball)) {
              drawings.push({
                date: drawing.date,
                numbers: numbers.sort((a, b) => a - b),
                powerball: powerball,
                jackpot: drawing.jackpot || null,
                source: 'MUSL Data Feed'
              });
            }
          }
        } catch (err) {
          console.log('Error parsing MUSL drawing:', err.message);
        }
      });
    }
    
    return drawings;
    
  } catch (error) {
    console.log('MUSL data extraction failed:', error.message);
    return [];
  }
}

// Extract from official Powerball archive HTML
function extractFromPowerballArchive(html, maxRecords = 500) {
  try {
    const drawings = [];
    
    // Look for structured data in HTML
    const drawingPattern = /(\d{1,2}\/\d{1,2}\/\d{4})[^0-9]*(\d{1,2})[^0-9]+(\d{1,2})[^0-9]+(\d{1,2})[^0-9]+(\d{1,2})[^0-9]+(\d{1,2})[^0-9]+(\d{1,2})/g;
    
    let match;
    while ((match = drawingPattern.exec(html)) !== null && drawings.length < maxRecords) {
      const [, dateStr, n1, n2, n3, n4, n5, pb] = match;
      
      // Convert MM/DD/YYYY to YYYY-MM-DD
      const dateParts = dateStr.split('/');
      const date = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
      
      const numbers = [parseInt(n1), parseInt(n2), parseInt(n3), parseInt(n4), parseInt(n5)];
      const powerball = parseInt(pb);
      
      if (isValidPowerballNumbers(numbers, powerball)) {
        drawings.push({
          date: date,
          numbers: numbers.sort((a, b) => a - b),
          powerball: powerball,
          source: 'Official Powerball Archive'
        });
      }
    }
    
    return drawings;
    
  } catch (error) {
    console.log('Powerball archive extraction failed:', error.message);
    return [];
  }
}

// Extract from Lottery Post API
function extractFromLotteryPost(data, maxRecords = 500) {
  try {
    const drawings = [];
    
    if (data && data.drawings && Array.isArray(data.drawings)) {
      data.drawings.forEach((drawing) => {
        if (drawings.length >= maxRecords) return;
        
        try {
          if (drawing.date && drawing.white_balls && drawing.red_ball) {
            const numbers = drawing.white_balls.map(n => parseInt(n));
            const powerball = parseInt(drawing.red_ball);
            
            if (isValidPowerballNumbers(numbers, powerball)) {
              drawings.push({
                date: drawing.date,
                numbers: numbers.sort((a, b) => a - b),
                powerball: powerball,
                jackpot: drawing.jackpot || null,
                source: 'Lottery Post API'
              });
            }
          }
        } catch (err) {
          console.log('Error parsing Lottery Post drawing:', err.message);
        }
      });
    }
    
    return drawings;
    
  } catch (error) {
    console.log('Lottery Post extraction failed:', error.message);
    return [];
  }
}

// Validate Powerball numbers
function isValidPowerballNumbers(numbers, powerball) {
  if (!Array.isArray(numbers) || numbers.length !== 5) return false;
  if (!powerball || powerball < 1 || powerball > 26) return false;
  
  for (const num of numbers) {
    if (!num || num < 1 || num > 69) return false;
  }
  
  // Check for duplicates
  const uniqueNumbers = new Set(numbers);
  if (uniqueNumbers.size !== 5) return false;
  
  return true;
}

// Validate historical data quality
function validateHistoricalData(drawings) {
  if (!Array.isArray(drawings) || drawings.length < 10) return false;
  
  // Check that we have reasonable data
  const validDrawings = drawings.filter(drawing => {
    return drawing.date && 
           drawing.numbers && 
           drawing.powerball &&
           isValidPowerballNumbers(drawing.numbers, drawing.powerball);
  });
  
  // At least 80% of data should be valid
  return validDrawings.length >= drawings.length * 0.8;
}

// Calculate frequency statistics
function calculateFrequencyStats(drawings) {
  const numberFreq = {};
  const powerballFreq = {};
  const totalDrawings = drawings.length;
  const recentDrawings = drawings.slice(0, Math.min(50, Math.floor(totalDrawings * 0.3)));
  
  // Initialize frequency counters
  for (let i = 1; i <= 69; i++) numberFreq[i] = { total: 0, recent: 0 };
  for (let i = 1; i <= 26; i++) powerballFreq[i] = { total: 0, recent: 0 };
  
  // Count frequencies
  drawings.forEach((drawing, index) => {
    const isRecent = index < recentDrawings.length;
    
    drawing.numbers.forEach(num => {
      numberFreq[num].total++;
      if (isRecent) numberFreq[num].recent++;
    });
    
    powerballFreq[drawing.powerball].total++;
    if (isRecent) powerballFreq[drawing.powerball].recent++;
  });
  
  // Calculate hot and cold numbers
  const hotNumbers = Object.entries(numberFreq)
    .sort((a, b) => (b[1].recent + b[1].total * 0.1) - (a[1].recent + a[1].total * 0.1))
    .slice(0, 25)
    .map(([num]) => parseInt(num));
    
  const coldNumbers = Object.entries(numberFreq)
    .sort((a, b) => (a[1].recent + a[1].total * 0.1) - (b[1].recent + b[1].total * 0.1))
    .slice(0, 25)
    .map(([num]) => parseInt(num));
    
  const hotPowerballs = Object.entries(powerballFreq)
    .sort((a, b) => (b[1].recent + b[1].total * 0.1) - (a[1].recent + a[1].total * 0.1))
    .slice(0, 10)
    .map(([num]) => parseInt(num));
    
  const coldPowerballs = Object.entries(powerballFreq)
    .sort((a, b) => (a[1].recent + a[1].total * 0.1) - (b[1].recent + b[1].total * 0.1))
    .slice(0, 10)
    .map(([num]) => parseInt(num));
  
  return {
    numberFrequency: numberFreq,
    powerballFrequency: powerballFreq,
    hotNumbers: hotNumbers,
    coldNumbers: coldNumbers,
    hotPowerballs: hotPowerballs,
    coldPowerballs: coldPowerballs,
    totalDrawings: totalDrawings,
    recentDrawings: recentDrawings.length,
    analysisDate: new Date().toISOString().split('T')[0],
    dataSource: 'Live Historical Data'
  };
}
