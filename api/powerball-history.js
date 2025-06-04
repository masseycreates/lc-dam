// api/powerball-history.js - Enhanced with multiple data sources and better reliability
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
    const limit = Math.min(Math.max(requestedLimit, 25), 2000); // Increased max to 2000
    
    console.log(`=== Historical API Request Started (${limit} drawings) ===`);
    console.log('Timestamp:', new Date().toISOString());
    
    // Enhanced historical data sources with higher limits and better reliability
    const historicalSources = [
      {
        name: 'NY State Open Data Portal (SODA API)',
        url: `https://data.ny.gov/resource/d6yy-54nr.json?$order=draw_date%20DESC&$limit=${Math.min(limit * 1.2, 1000)}`,
        type: 'json',
        extractor: extractFromNYStateAPI,
        timeout: 20000,
        priority: 1
      },
      {
        name: 'NY State Full Download API',
        url: 'https://data.ny.gov/api/views/d6yy-54nr/rows.json?accessType=DOWNLOAD',
        type: 'json',
        extractor: extractFromNYStateFullAPI,
        timeout: 30000,
        priority: 2
      },
      {
        name: 'NY State Powerball History Dataset',
        url: `https://data.ny.gov/resource/dhwa-m6y4.json?$order=date%20DESC&$limit=${Math.min(limit * 1.2, 1000)}`,
        type: 'json',
        extractor: extractFromNYStateHistoryAPI,
        timeout: 20000,
        priority: 3
      },
      {
        name: 'Texas Lottery CSV Data',
        url: 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/powerball.csv',
        type: 'csv',
        extractor: extractFromTexasCSV,
        timeout: 15000,
        priority: 4
      },
      {
        name: 'Lottery Statistics API',
        url: `https://api.powerball.net/v1/numbers/history?limit=${Math.min(limit, 500)}`,
        type: 'json',
        extractor: extractFromLotteryStatsAPI,
        timeout: 12000,
        priority: 5
      },
      {
        name: 'Texas Lottery Historical HTML',
        url: 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/',
        type: 'html',
        extractor: extractFromTexasHistoricalHTML,
        timeout: 10000,
        priority: 6
      }
    ];

    let historicalData = [];
    let sourceUsed = null;
    let errors = [];

    // Try each source sequentially with enhanced error handling
    for (const source of historicalSources) {
      try {
        console.log(`\n--- Attempting ${source.name} (Priority: ${source.priority}) ---`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), source.timeout);
        
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': source.type === 'json' ? 'application/json' : 
                     source.type === 'csv' ? 'text/csv,text/plain' : 
                     'text/html,application/xhtml+xml',
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
        
        let data;
        if (source.type === 'json') {
          data = await response.json();
        } else if (source.type === 'csv') {
          data = await response.text();
        } else {
          data = await response.text();
        }
        
        console.log(`${source.name} data received, processing...`);
        const extractedData = source.extractor(data, limit);
        
        if (extractedData && extractedData.length > 0 && validateHistoricalData(extractedData)) {
          historicalData = extractedData;
          sourceUsed = source.name;
          console.log(`✅ Success from ${source.name}: ${extractedData.length} valid drawings`);
          console.log(`   Date range: ${extractedData[0]?.date} to ${extractedData[extractedData.length - 1]?.date}`);
          break;
        } else {
          throw new Error(`No valid historical data returned (got ${extractedData?.length || 0} records)`);
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
      console.log('=== FAILURE: No historical data sources working ===');
      return res.status(503).json({
        success: false,
        dataAvailable: false,
        message: 'HISTORICAL POWERBALL DATA TEMPORARILY UNAVAILABLE',
        details: 'Unable to retrieve historical drawing data from official sources. Number optimization features are disabled.',
        lastAttempted: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        debug: {
          sourcesAttempted: historicalSources.length,
          errors: errors,
          requestedLimit: limit
        }
      });
    }

    // Sort and limit data
    const sortedData = historicalData
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);

    // Calculate enhanced statistics
    const statistics = calculateAdvancedFrequencyStats(sortedData);
    
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
        dataQuality: {
          completeness: (sortedData.length / limit * 100).toFixed(1) + '%',
          sourceReliability: sourceUsed.includes('NY State') ? 'High' : 'Medium',
          lastUpdated: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString(),
      debug: {
        sourcesAttempted: historicalSources.length,
        errors: errors,
        successfulSource: sourceUsed
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

// Enhanced extraction functions

// Extract from NY State SODA API (current endpoint)
function extractFromNYStateAPI(data, maxRecords = 1000) {
  try {
    console.log('NY State SODA API extractor - processing...');
    const drawings = [];
    
    if (Array.isArray(data)) {
      console.log(`Processing ${data.length} records from SODA API`);
      
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
                  source: 'NY State SODA API'
                });
              }
            }
          }
        } catch (err) {
          console.log('Error parsing NY State SODA drawing:', err.message);
        }
      });
    }
    
    console.log(`NY State SODA API extracted ${drawings.length} valid drawings`);
    return drawings;
    
  } catch (error) {
    console.log('NY State SODA API extraction failed:', error.message);
    return [];
  }
}

// Extract from NY State Full Download API (potentially thousands of records)
function extractFromNYStateFullAPI(data, maxRecords = 2000) {
  try {
    console.log('NY State Full API extractor - processing...');
    const drawings = [];
    
    if (data && data.data && Array.isArray(data.data)) {
      console.log(`Processing ${data.data.length} records from Full Download API`);
      
      // Skip header row if present
      const dataRows = data.data.slice(1);
      
      dataRows.forEach((row) => {
        if (drawings.length >= maxRecords) return;
        
        try {
          // NY State format: [id, date, winning_numbers, jackpot, ...]
          const date = row[1] ? new Date(row[1]).toISOString().split('T')[0] : null;
          const winningNumbers = row[2];
          const jackpot = row[3];
          
          if (date && winningNumbers) {
            const numberParts = winningNumbers.toString().trim().split(/\s+/);
            
            if (numberParts.length >= 6) {
              const numbers = numberParts.slice(0, 5).map(n => parseInt(n));
              const powerball = parseInt(numberParts[5]);
              
              if (isValidPowerballNumbers(numbers, powerball)) {
                drawings.push({
                  date: date,
                  numbers: numbers.sort((a, b) => a - b),
                  powerball: powerball,
                  jackpot: jackpot ? parseInt(jackpot) : null,
                  source: 'NY State Full API'
                });
              }
            }
          }
        } catch (err) {
          console.log('Error parsing NY State Full API drawing:', err.message);
        }
      });
    }
    
    console.log(`NY State Full API extracted ${drawings.length} valid drawings`);
    return drawings;
    
  } catch (error) {
    console.log('NY State Full API extraction failed:', error.message);
    return [];
  }
}

// Extract from NY State History Dataset
function extractFromNYStateHistoryAPI(data, maxRecords = 1000) {
  try {
    console.log('NY State History API extractor - processing...');
    const drawings = [];
    
    if (Array.isArray(data)) {
      console.log(`Processing ${data.length} records from History API`);
      
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
                source: 'NY State History API'
              });
            }
          }
        } catch (err) {
          console.log('Error parsing NY State history drawing:', err.message);
        }
      });
    }
    
    console.log(`NY State History API extracted ${drawings.length} valid drawings`);
    return drawings;
    
  } catch (error) {
    console.log('NY State History API extraction failed:', error.message);
    return [];
  }
}

// Extract from Texas CSV (potentially very comprehensive)
function extractFromTexasCSV(csvText, maxRecords = 1000) {
  try {
    console.log('Texas CSV extractor - processing...');
    const drawings = [];
    const lines = csvText.split('\n');
    
    console.log(`Processing ${lines.length} lines from Texas CSV`);
    
    lines.forEach((line, index) => {
      if (drawings.length >= maxRecords) return;
      if (index === 0) return; // Skip header
      
      try {
        const parts = line.split(',');
        if (parts.length >= 7) {
          // Texas format: Game, Month, Day, Year, Num1, Num2, Num3, Num4, Num5, Powerball
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          const year = parseInt(parts[3]);
          
          if (year && month && day) {
            const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const numbers = [
              parseInt(parts[4]),
              parseInt(parts[5]),
              parseInt(parts[6]),
              parseInt(parts[7]),
              parseInt(parts[8])
            ];
            const powerball = parseInt(parts[9]);
            
            if (isValidPowerballNumbers(numbers, powerball)) {
              drawings.push({
                date: date,
                numbers: numbers.sort((a, b) => a - b),
                powerball: powerball,
                source: 'Texas CSV'
              });
            }
          }
        }
      } catch (err) {
        console.log(`Error parsing Texas CSV line ${index}:`, err.message);
      }
    });
    
    console.log(`Texas CSV extracted ${drawings.length} valid drawings`);
    return drawings;
    
  } catch (error) {
    console.log('Texas CSV extraction failed:', error.message);
    return [];
  }
}

// Extract from Lottery Statistics API (hypothetical, but good pattern)
function extractFromLotteryStatsAPI(data, maxRecords = 500) {
  try {
    console.log('Lottery Stats API extractor - processing...');
    const drawings = [];
    
    if (data && data.status === 'success' && Array.isArray(data.results)) {
      console.log(`Processing ${data.results.length} records from Lottery Stats API`);
      
      data.results.forEach((drawing) => {
        if (drawings.length >= maxRecords) return;
        
        try {
          if (drawing.date && drawing.white_balls && drawing.powerball) {
            const numbers = Array.isArray(drawing.white_balls) ? 
              drawing.white_balls.map(n => parseInt(n)) :
              drawing.white_balls.split(',').map(n => parseInt(n.trim()));
            const powerball = parseInt(drawing.powerball);
            
            if (isValidPowerballNumbers(numbers, powerball)) {
              drawings.push({
                date: drawing.date,
                numbers: numbers.sort((a, b) => a - b),
                powerball: powerball,
                jackpot: drawing.jackpot || null,
                source: 'Lottery Stats API'
              });
            }
          }
        } catch (err) {
          console.log('Error parsing Lottery Stats API drawing:', err.message);
        }
      });
    }
    
    console.log(`Lottery Stats API extracted ${drawings.length} valid drawings`);
    return drawings;
    
  } catch (error) {
    console.log('Lottery Stats API extraction failed:', error.message);
    return [];
  }
}

// Extract from Texas Historical HTML (enhanced)
function extractFromTexasHistoricalHTML(html, maxRecords = 200) {
  try {
    console.log('Texas Historical HTML extractor - processing...');
    const drawings = [];
    
    // Enhanced patterns for different date and number formats
    const patterns = [
      /(\d{2}\/\d{2}\/\d{4})[^0-9]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*PB:\s*(\d{1,2})/gi,
      /Date:\s*(\d{2}\/\d{2}\/\d{4})[^0-9]*Numbers:\s*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})/gi,
      /(\d{1,2}\/\d{1,2}\/\d{4})[^0-9]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,2})/gi
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
            // Check for duplicates
            const isDuplicate = drawings.some(d => 
              d.date === date && 
              JSON.stringify(d.numbers) === JSON.stringify(numbers.sort((a, b) => a - b)) &&
              d.powerball === powerball
            );
            
            if (!isDuplicate) {
              drawings.push({
                date: date,
                numbers: numbers.sort((a, b) => a - b),
                powerball: powerball,
                source: 'Texas Historical HTML'
              });
            }
          }
        } catch (err) {
          console.log('Error parsing Texas HTML result:', err.message);
        }
      }
    }
    
    console.log(`Texas Historical HTML extracted ${drawings.length} valid drawings`);
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
  const validityRatio = validDrawings.length / drawings.length;
  console.log(`Data validation: ${validDrawings.length}/${drawings.length} valid (${(validityRatio * 100).toFixed(1)}%)`);
  
  return validityRatio >= 0.8;
}

// Enhanced frequency statistics calculation
function calculateAdvancedFrequencyStats(drawings) {
  const numberFreq = {};
  const powerballFreq = {};
  const totalDrawings = drawings.length;
  const recentDrawings = drawings.slice(0, Math.min(50, Math.floor(totalDrawings * 0.3)));
  
  // Initialize frequency counters
  for (let i = 1; i <= 69; i++) numberFreq[i] = { total: 0, recent: 0, lastSeen: null };
  for (let i = 1; i <= 26; i++) powerballFreq[i] = { total: 0, recent: 0, lastSeen: null };
  
  // Count frequencies and track last seen dates
  drawings.forEach((drawing, index) => {
    const isRecent = index < recentDrawings.length;
    
    drawing.numbers.forEach(num => {
      numberFreq[num].total++;
      if (isRecent) numberFreq[num].recent++;
      if (!numberFreq[num].lastSeen) numberFreq[num].lastSeen = drawing.date;
    });
    
    powerballFreq[drawing.powerball].total++;
    if (isRecent) powerballFreq[drawing.powerball].recent++;
    if (!powerballFreq[drawing.powerball].lastSeen) powerballFreq[drawing.powerball].lastSeen = drawing.date;
  });
  
  // Calculate hot and cold numbers with enhanced scoring
  const hotNumbers = Object.entries(numberFreq)
    .map(([num, freq]) => ({
      number: parseInt(num),
      score: freq.recent * 3 + freq.total * 0.2, // Weighted more toward recent
      totalFreq: freq.total,
      recentFreq: freq.recent,
      lastSeen: freq.lastSeen
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)
    .map(item => item.number);
    
  const coldNumbers = Object.entries(numberFreq)
    .map(([num, freq]) => ({
      number: parseInt(num),
      score: freq.recent * 3 + freq.total * 0.2,
      totalFreq: freq.total,
      recentFreq: freq.recent,
      lastSeen: freq.lastSeen
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 25)
    .map(item => item.number);
    
  const hotPowerballs = Object.entries(powerballFreq)
    .map(([num, freq]) => ({
      number: parseInt(num),
      score: freq.recent * 3 + freq.total * 0.2,
      totalFreq: freq.total,
      recentFreq: freq.recent,
      lastSeen: freq.lastSeen
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.number);
    
  const coldPowerballs = Object.entries(powerballFreq)
    .map(([num, freq]) => ({
      number: parseInt(num),
      score: freq.recent * 3 + freq.total * 0.2,
      totalFreq: freq.total,
      recentFreq: freq.recent,
      lastSeen: freq.lastSeen
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
    },
    qualityMetrics: {
      dataCompleteness: (totalDrawings / 500 * 100).toFixed(1) + '%',
      recentCoverage: (recentDrawings.length / 50 * 100).toFixed(1) + '%',
      historicalDepth: calculateHistoricalDepth(drawings)
    }
  };
}

// Calculate how far back the historical data goes
function calculateHistoricalDepth(drawings) {
  if (drawings.length === 0) return 'No data';
  
  const earliestDate = new Date(drawings[drawings.length - 1].date);
  const latestDate = new Date(drawings[0].date);
  const daysDiff = Math.floor((latestDate - earliestDate) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 365) {
    return `${Math.floor(daysDiff / 365)} years`;
  } else if (daysDiff > 30) {
    return `${Math.floor(daysDiff / 30)} months`;
  } else {
    return `${daysDiff} days`;
  }
}
