// api/powerball-history.js - Updated with working historical data sources for 2025
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
    
    // Updated reliable historical data sources for 2025
    const historicalSources = [
      {
        name: 'NY State Open Data Portal (Primary)',
        url: `https://data.ny.gov/resource/d6yy-54nr.json?$order=draw_date%20DESC&$limit=${Math.min(limit * 1.2, 600)}`,
        type: 'json',
        extractor: extractFromNYStateAPI,
        timeout: 15000
      },
      {
        name: 'NY State Powerball History Dataset',
        url: `https://data.ny.gov/resource/dhwa-m6y4.json?$order=draw_date%20DESC&$limit=${Math.min(limit * 1.2, 600)}`,
        type: 'json',
        extractor: extractFromNYStateHistoryAPI,
        timeout: 15000
      },
      {
        name: 'Magayo Historical API',
        url: `https://www.magayo.com/api/results.php?api_key=hXJDjsp8I6RY&game=us_powerball&limit=${Math.min(limit, 200)}`,
        type: 'json',
        extractor: extractFromMagayoHistoricalAPI,
        timeout: 12000
      },
      {
        name: 'Official Powerball Results Page',
        url: 'https://www.powerball.com/previous-results',
        type: 'html',
        extractor: extractFromPowerballResultsPage,
        timeout: 10000
      },
      {
        name: 'Texas Lottery Historical Data',
        url: 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/',
        type: 'html',
        extractor: extractFromTexasHistoricalHTML,
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': source.type === 'json' ? 'application/json' : 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
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

// NEW: Extract from NY State Open Data API (most reliable)
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
                  multiplier: drawing.multiplier || null,
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

// NEW: Extract from NY State History Dataset
function extractFromNYStateHistoryAPI(data, maxRecords = 500) {
  try {
    const drawings = [];
    
    if (Array.isArray(data)) {
      data.forEach((drawing) => {
        if (drawings.length >= maxRecords) return;
        
        try {
          const date = drawing.date || drawing.draw_date;
          if (date && drawing.white_balls && drawing.powerball) {
            let numbers = [];
            
            // Handle different formats
            if (Array.isArray(drawing.white_balls)) {
              numbers = drawing.white_balls.map(n => parseInt(n));
            } else if (typeof drawing.white_balls === 'string') {
              numbers = drawing.white_balls.split(/[,\s]+/).map(n => parseInt(n.trim()));
            }
            
            const powerball = parseInt(drawing.powerball);
            
            if (isValidPowerballNumbers(numbers, powerball)) {
              drawings.push({
                date: date.split('T')[0],
                numbers: numbers.sort((a, b) => a - b),
                powerball: powerball,
                jackpot: drawing.jackpot || null,
                source: 'NY State History'
              });
            }
          }
        } catch (err) {
          console.log('Error parsing NY State history drawing:', err.message);
        }
      });
    }
    
    return drawings;
    
  } catch (error) {
    console.log('NY State History API extraction failed:', error.message);
    return [];
  }
}

// NEW: Extract from Magayo Historical API
function extractFromMagayoHistoricalAPI(data, maxRecords = 500) {
  try {
    const drawings = [];
    
    if (data && data.status === 'success' && Array.isArray(data.results)) {
      data.results.forEach((drawing) => {
        if (drawings.length >= maxRecords) return;
        
        try {
          if (drawing.date && drawing.white_balls && drawing.powerball) {
            const numbers = drawing.white_balls.map(n => parseInt(n));
            const powerball = parseInt(drawing.powerball);
            
            if (isValidPowerballNumbers(numbers, powerball)) {
              drawings.push({
                date: drawing.date,
                numbers: numbers.sort((a, b) => a - b),
                powerball: powerball,
                jackpot: drawing.jackpot || null,
                source: 'Magayo API'
              });
            }
          }
        } catch (err) {
          console.log('Error parsing Magayo drawing:', err.message);
        }
      });
    }
    
    return drawings;
    
  } catch (error) {
    console.log('Magayo Historical API extraction failed:', error.message);
    return [];
  }
}

// NEW: Extract from Official Powerball Results Page
function extractFromPowerballResultsPage(html, maxRecords = 500) {
  try {
    const drawings = [];
    
    // Updated pattern for 2025 Powerball results page
    const drawingPattern = /(\d{2}\/\d{2}\/\d{4})[^0-9]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})/g;
    
    let match;
    while ((match = drawingPattern.exec(html)) !== null && drawings.length < maxRecords) {
      try {
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
            source: 'Official Powerball Results'
          });
        }
      } catch (err) {
        console.log('Error parsing Powerball result:', err.message);
      }
    }
    
    return drawings;
    
  } catch (error) {
    console.log('Powerball results page extraction failed:', error.message);
    return [];
  }
}

// NEW: Extract from Texas Historical HTML
function extractFromTexasHistoricalHTML(html, maxRecords = 500) {
  try {
    const drawings = [];
    
    // Look for Texas-specific patterns
    const patterns = [
      /(\d{2}\/\d{2}\/\d{4})[^0-9]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*PB:\s*(\d{1,2})/gi,
      /Date:\s*(\d{2}\/\d{2}\/\d{4})[^0-9]*Numbers:\s*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && drawings.length < maxRecords) {
        try {
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
              source: 'Texas Lottery'
            });
          }
        } catch (err) {
          console.log('Error parsing Texas result:', err.message);
        }
      }
    }
    
    return drawings;
    
  } catch (error) {
    console.log('Texas historical HTML extraction failed:', error.message);
    return [];
  }
}

// Validate Powerball numbers (updated for current rules)
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

// Calculate frequency statistics (enhanced version)
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
  
  // Calculate hot and cold numbers with better algorithm
  const hotNumbers = Object.entries(numberFreq)
    .map(([num, freq]) => ({
      number: parseInt(num),
      score: freq.recent * 2 + freq.total * 0.1,
      totalFreq: freq.total,
      recentFreq: freq.recent
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)
    .map(item => item.number);
    
  const coldNumbers = Object.entries(numberFreq)
    .map(([num, freq]) => ({
      number: parseInt(num),
      score: freq.recent * 2 + freq.total * 0.1,
      totalFreq: freq.total,
      recentFreq: freq.recent
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 25)
    .map(item => item.number);
    
  const hotPowerballs = Object.entries(powerballFreq)
    .map(([num, freq]) => ({
      number: parseInt(num),
      score: freq.recent * 2 + freq.total * 0.1,
      totalFreq: freq.total,
      recentFreq: freq.recent
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.number);
    
  const coldPowerballs = Object.entries(powerballFreq)
    .map(([num, freq]) => ({
      number: parseInt(num),
      score: freq.recent * 2 + freq.total * 0.1,
      totalFreq: freq.total,
      recentFreq: freq.recent
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 10)
    .map(item => item.number);
  
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
    dataSource: 'Live Historical Data',
    dateRange: {
      latest: drawings[0]?.date || null,
      earliest: drawings[drawings.length - 1]?.date || null
    }
  };
}
