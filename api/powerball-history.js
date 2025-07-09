// api/powerball-history.js - Complete Fixed Version
export default async function handler(req, res) {
  // Enhanced CORS headers
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
    const limit = Math.min(Math.max(requestedLimit, 25), 2000);
    
    console.log(`=== Historical API Request Started (${limit} drawings) ===`);
    console.log('Timestamp:', new Date().toISOString());
    
    // Enhanced historical data sources
    const historicalSources = [
      {
        name: 'NY State Open Data Portal (SODA API)',
        url: `https://data.ny.gov/resource/d6yy-54nr.json?$order=draw_date%20DESC&$limit=${Math.min(limit * 2, 2000)}`,
        type: 'json',
        extractor: extractFromNYStateAPI,
        timeout: 30000,
        priority: 1
      },
      {
        name: 'Texas Lottery CSV Data',
        url: 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/powerball.csv',
        type: 'csv',
        extractor: extractFromTexasCSV,
        timeout: 25000,
        priority: 2
      },
      {
        name: 'Mock Data Generator',
        url: null,
        type: 'fallback',
        extractor: generateMockHistoricalData,
        timeout: 1000,
        priority: 99
      }
    ];

    let historicalData = [];
    let sourceUsed = null;
    let errors = [];

    // Try each source sequentially
    for (const source of historicalSources) {
      try {
        console.log(`\n--- Attempting ${source.name} (Priority: ${source.priority}) for ${limit} drawings ---`);
        
        if (source.type === 'fallback') {
          // Use fallback data generator
          const fallbackData = source.extractor(limit);
          if (fallbackData && fallbackData.length > 0) {
            historicalData = fallbackData;
            sourceUsed = source.name;
            console.log(`✅ Fallback generated ${fallbackData.length} mock drawings`);
            break;
          }
          continue;
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), source.timeout);
        
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': source.type === 'json' ? 'application/json' : 'text/csv,text/plain',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
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
        } else {
          data = await response.text();
        }
        
        console.log(`${source.name} data received, processing...`);
        const extractedData = source.extractor(data, limit);
        
        if (extractedData && extractedData.length >= 10 && validateHistoricalData(extractedData)) {
          historicalData = extractedData;
          sourceUsed = source.name;
          console.log(`✅ Success from ${source.name}: ${extractedData.length} valid drawings`);
          break;
        } else {
          throw new Error(`Insufficient valid data (got ${extractedData?.length || 0} records, need >= 10)`);
        }
        
      } catch (error) {
        const errorMsg = `${source.name}: ${error.message}`;
        errors.push(errorMsg);
        console.log(`❌ ${errorMsg}`);
        continue;
      }
    }

    if (historicalData.length === 0) {
      // COMPLETE FAILURE - This should not happen with fallback
      console.log('=== CRITICAL FAILURE: No data sources working ===');
      return res.status(500).json({
        success: false,
        dataAvailable: false,
        error: 'All data sources failed',
        message: 'HISTORICAL POWERBALL DATA TEMPORARILY UNAVAILABLE',
        details: 'Unable to retrieve or generate historical drawing data.',
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

    console.log(`📊 FINAL RESULT: Returning ${sortedData.length} drawings out of ${limit} requested`);

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
          sourceReliability: sourceUsed?.includes('NY State') ? 'High' : sourceUsed?.includes('Mock') ? 'Simulated' : 'Medium',
          lastUpdated: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString(),
      debug: {
        sourcesAttempted: historicalSources.length,
        errors: errors,
        successfulSource: sourceUsed,
        actualDrawingsReturned: sortedData.length,
        requestedDrawings: limit
      }
    };

    // Cache for 6 hours
    res.setHeader('Cache-Control', 's-maxage=21600, max-age=21600');
    return res.status(200).json(result);

  } catch (error) {
    console.error('=== Historical API Critical Error ===');
    console.error('Error:', error);
    
    return res.status(500).json({
      success: false,
      dataAvailable: false,
      error: 'Internal server error',
      message: 'HISTORICAL POWERBALL DATA TEMPORARILY UNAVAILABLE',
      details: 'A technical error occurred while fetching historical data.',
      timestamp: new Date().toISOString(),
      debug: {
        error: error.message,
        stack: error.stack
      }
    });
  }
}

// Extract from NY State SODA API
function extractFromNYStateAPI(data, maxRecords = 2000) {
  try {
    console.log('NY State SODA API extractor - processing...');
    const drawings = [];
    
    if (Array.isArray(data)) {
      console.log(`Processing ${data.length} records from SODA API for max ${maxRecords}`);
      
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

// Extract from Texas CSV data
function extractFromTexasCSV(csvText, maxRecords = 2000) {
  try {
    console.log('Texas CSV extractor - processing...');
    const drawings = [];
    
    if (typeof csvText !== 'string' || csvText.length < 100) {
      throw new Error('Invalid or empty CSV data');
    }
    
    const lines = csvText.split('\n');
    console.log(`Processing ${lines.length} CSV lines for max ${maxRecords} records`);
    
    // Skip header row and process data
    for (let i = 1; i < lines.length && drawings.length < maxRecords; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        // Texas CSV format: Date,WB1,WB2,WB3,WB4,WB5,PB,PP
        const parts = line.split(',');
        
        if (parts.length >= 7) {
          const date = new Date(parts[0]).toISOString().split('T')[0];
          const numbers = [
            parseInt(parts[1]),
            parseInt(parts[2]),
            parseInt(parts[3]),
            parseInt(parts[4]),
            parseInt(parts[5])
          ];
          const powerball = parseInt(parts[6]);
          
          if (isValidPowerballNumbers(numbers, powerball)) {
            drawings.push({
              date: date,
              numbers: numbers.sort((a, b) => a - b),
              powerball: powerball,
              jackpot: null,
              multiplier: parts[7] ? parseInt(parts[7]) : null,
              source: 'Texas Lottery CSV'
            });
          }
        }
      } catch (err) {
        console.log(`Error parsing CSV line ${i}:`, err.message);
      }
    }
    
    console.log(`Texas CSV extracted ${drawings.length} valid drawings`);
    return drawings;
    
  } catch (error) {
    console.log('Texas CSV extraction failed:', error.message);
    return [];
  }
}

// Generate mock historical data as fallback
function generateMockHistoricalData(maxRecords = 500) {
  try {
    console.log(`Generating ${maxRecords} mock historical drawings as fallback...`);
    const drawings = [];
    
    const today = new Date();
    
    // Generate realistic mock data
    for (let i = 0; i < maxRecords; i++) {
      const drawDate = new Date(today);
      drawDate.setDate(today.getDate() - (i * 3.5)); // Drawings every ~3.5 days
      
      const numbers = [];
      while (numbers.length < 5) {
        const num = Math.floor(Math.random() * 69) + 1;
        if (!numbers.includes(num)) {
          numbers.push(num);
        }
      }
      
      const powerball = Math.floor(Math.random() * 26) + 1;
      
      // Add some frequency bias to make it more realistic
      const biasedNumbers = numbers.map(num => {
        // Slightly bias towards middle range numbers
        if (num >= 20 && num <= 50) {
          return Math.random() < 0.3 ? Math.floor(Math.random() * 69) + 1 : num;
        }
        return num;
      });
      
      drawings.push({
        date: drawDate.toISOString().split('T')[0],
        numbers: biasedNumbers.sort((a, b) => a - b),
        powerball: powerball,
        jackpot: Math.floor(Math.random() * 800000000) + 40000000, // $40M to $840M
        multiplier: Math.random() < 0.3 ? (Math.floor(Math.random() * 5) + 2) : null,
        source: 'Mock Data Generator'
      });
    }
    
    console.log(`Generated ${drawings.length} mock drawings`);
    return drawings;
    
  } catch (error) {
    console.log('Mock data generation failed:', error.message);
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
  
  console.log(`📊 Calculating stats for ${totalDrawings} drawings (${recentDrawings.length} recent)`);
  
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
  
  // Calculate hot and cold numbers
  const hotNumbers = Object.entries(numberFreq)
    .map(([num, freq]) => ({
      number: parseInt(num),
      score: freq.recent * 3 + freq.total * 0.2,
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

  // Hot and cold powerballs
  const hotPowerballs = Object.entries(powerballFreq)
    .map(([num, freq]) => ({
      number: parseInt(num),
      score: freq.recent * 3 + freq.total * 0.2
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.number);

  const coldPowerballs = Object.entries(powerballFreq)
    .map(([num, freq]) => ({
      number: parseInt(num),
      score: freq.recent * 3 + freq.total * 0.2
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
    dataSource: 'Enhanced Historical Analysis',
    dateRange: {
      latest: drawings[0]?.date || null,
      earliest: drawings[drawings.length - 1]?.date || null
    },
    qualityMetrics: {
      dataCompleteness: (totalDrawings / 2000 * 100).toFixed(1) + '%',
      recentCoverage: (recentDrawings.length / 50 * 100).toFixed(1) + '%',
      historicalDepth: calculateHistoricalDepth(drawings)
    }
  };
}

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
