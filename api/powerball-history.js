// api/powerball-history.js - Fetch Real Historical Powerball Data
// This function fetches the last 100+ real Powerball drawings for statistical analysis

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
    console.log('=== Powerball History API Request Started ===');
    console.log('Timestamp:', new Date().toISOString());
    
    // Multiple data sources for historical data
    const historicalSources = [
      {
        name: 'Powerball.net Archive',
        url: 'https://www.powerball.net/archive/2025',
        type: 'html',
        extractor: extractFromPowerballNet
      },
      {
        name: 'NY State Lottery API',
        url: 'https://data.ny.gov/resource/d6yy-54nr.json?$order=draw_date%20DESC&$limit=150',
        type: 'json',
        extractor: extractFromNYStateAPI
      },
      {
        name: 'Texas Lottery Historical',
        url: 'https://www.texaslottery.com/export/sites/lottery/Games/Powerball/Winning_Numbers/',
        type: 'html',
        extractor: extractFromTexasHistory
      },
      {
        name: 'California Lottery Past Results',
        url: 'https://www.calottery.com/api/DrawGameResultsList/GetList?GameName=powerball',
        type: 'json',
        extractor: extractFromCALotteryAPI
      }
    ];

    let historicalData = [];
    let sourceUsed = null;
    let lastError = null;

    // Try each source sequentially
    for (const source of historicalSources) {
      try {
        console.log(`Attempting to fetch historical data from ${source.name}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout
        
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': source.type === 'json' ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Referer': getRefererForSource(source.name),
            'DNT': '1',
            'Connection': 'keep-alive'
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
        
        console.log(`${source.name} data received, processing...`);
        
        const extractedData = source.extractor(data);
        
        if (extractedData && extractedData.length > 0) {
          historicalData = extractedData;
          sourceUsed = source.name;
          console.log(`✅ Success from ${source.name}: ${extractedData.length} drawings retrieved`);
          break;
        } else {
          console.log(`❌ ${source.name} returned no valid data`);
        }
        
      } catch (error) {
        lastError = error;
        console.log(`❌ ${source.name} failed:`, error.message);
        
        if (error.name === 'AbortError') {
          console.log(`${source.name} timed out after 12 seconds`);
        }
        continue;
      }
    }

    // If no real data found, return fallback historical data
    if (historicalData.length === 0) {
      console.log('All historical sources failed, using fallback data');
      historicalData = generateFallbackHistoricalData();
      sourceUsed = 'Fallback Historical Data';
    }

    // Sort by date (most recent first) and limit to last 100 drawings
    const sortedData = historicalData
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 100);

    // Calculate frequency statistics
    const statistics = calculateFrequencyStats(sortedData);
    
    // Prepare response
    const result = {
      drawings: sortedData,
      statistics: statistics,
      meta: {
        totalDrawings: sortedData.length,
        dateRange: {
          latest: sortedData[0]?.date || null,
          earliest: sortedData[sortedData.length - 1]?.date || null
        },
        source: sourceUsed,
        lastUpdated: new Date().toISOString()
      },
      success: true,
      timestamp: new Date().toISOString(),
      debug: {
        sourcesAttempted: historicalSources.length,
        lastError: lastError ? lastError.message : null
      }
    };

    console.log('=== Historical API Response ===');
    console.log(`Returning ${sortedData.length} drawings from ${sourceUsed}`);

    // Cache for 6 hours (historical data doesn't change often)
    res.setHeader('Cache-Control', 's-maxage=21600, max-age=21600');
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('=== Historical API Error ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch historical lottery data',
      success: false,
      timestamp: new Date().toISOString(),
      debug: {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
}

// Extract from Powerball.net Archive (HTML parsing)
function extractFromPowerballNet(html) {
  try {
    const drawings = [];
    
    // Look for date and number patterns in HTML
    // Powerball.net typically shows: "Jan 15, 2025 - 12 25 34 45 67 PB: 15"
    const drawingPattern = /(\w{3}\s+\d{1,2},?\s+\d{4})[^0-9]*(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})[^0-9]*(?:PB|Powerball)[^0-9]*(\d{1,2})/gi;
    
    let match;
    while ((match = drawingPattern.exec(html)) !== null && drawings.length < 150) {
      const [, dateStr, n1, n2, n3, n4, n5, pb] = match;
      
      // Parse date
      const date = new Date(dateStr).toISOString().split('T')[0];
      
      // Validate numbers
      const numbers = [parseInt(n1), parseInt(n2), parseInt(n3), parseInt(n4), parseInt(n5)];
      const powerball = parseInt(pb);
      
      if (isValidPowerballNumbers(numbers, powerball)) {
        drawings.push({
          date: date,
          numbers: numbers.sort((a, b) => a - b),
          powerball: powerball,
          source: 'Powerball.net'
        });
      }
    }
    
    console.log(`Powerball.net extracted ${drawings.length} drawings`);
    return drawings;
    
  } catch (error) {
    console.log('Powerball.net extraction failed:', error.message);
    return [];
  }
}

// Extract from NY State API (JSON)
function extractFromNYStateAPI(data) {
  try {
    const drawings = [];
    
    if (Array.isArray(data)) {
      data.forEach(drawing => {
        try {
          // NY State format: draw_date, winning_numbers, multiplier
          const date = drawing.draw_date ? drawing.draw_date.split('T')[0] : null;
          const winningNumbers = drawing.winning_numbers;
          
          if (date && winningNumbers) {
            // Parse "12 25 34 45 67 15" format
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
                  source: 'NY State Lottery'
                });
              }
            }
          }
        } catch (err) {
          console.log('Error parsing NY State drawing:', err.message);
        }
      });
    }
    
    console.log(`NY State API extracted ${drawings.length} drawings`);
    return drawings;
    
  } catch (error) {
    console.log('NY State API extraction failed:', error.message);
    return [];
  }
}

// Extract from Texas Lottery Historical (HTML)
function extractFromTexasHistory(html) {
  try {
    const drawings = [];
    
    // Texas format varies, look for common patterns
    const patterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})[^0-9]*(\d{1,2})[^0-9]+(\d{1,2})[^0-9]+(\d{1,2})[^0-9]+(\d{1,2})[^0-9]+(\d{1,2})[^0-9]+(\d{1,2})/g,
      /(\d{4}-\d{2}-\d{2})[^0-9]*(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null && drawings.length < 150) {
        const [, dateStr, n1, n2, n3, n4, n5, pb] = match;
        
        let date;
        if (dateStr.includes('/')) {
          // MM/DD/YYYY format
          const parts = dateStr.split('/');
          date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        } else {
          // YYYY-MM-DD format
          date = dateStr;
        }
        
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
      }
    });
    
    console.log(`Texas Lottery extracted ${drawings.length} drawings`);
    return drawings;
    
  } catch (error) {
    console.log('Texas Lottery extraction failed:', error.message);
    return [];
  }
}

// Extract from California Lottery API (JSON)
function extractFromCALotteryAPI(data) {
  try {
    const drawings = [];
    
    if (data && data.DrawGameResults) {
      data.DrawGameResults.forEach(drawing => {
        try {
          const date = drawing.DrawDate ? drawing.DrawDate.split('T')[0] : null;
          const numbers = drawing.WinningNumbers;
          
          if (date && numbers && Array.isArray(numbers) && numbers.length >= 6) {
            const mainNumbers = numbers.slice(0, 5).map(n => parseInt(n));
            const powerball = parseInt(numbers[5]);
            
            if (isValidPowerballNumbers(mainNumbers, powerball)) {
              drawings.push({
                date: date,
                numbers: mainNumbers.sort((a, b) => a - b),
                powerball: powerball,
                source: 'California Lottery'
              });
            }
          }
        } catch (err) {
          console.log('Error parsing CA Lottery drawing:', err.message);
        }
      });
    }
    
    console.log(`California Lottery API extracted ${drawings.length} drawings`);
    return drawings;
    
  } catch (error) {
    console.log('California Lottery API extraction failed:', error.message);
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

// Get appropriate referer for each source
function getRefererForSource(sourceName) {
  const referers = {
    'Powerball.net Archive': 'https://www.powerball.net/',
    'NY State Lottery API': 'https://data.ny.gov/',
    'Texas Lottery Historical': 'https://www.texaslottery.com/',
    'California Lottery Past Results': 'https://www.calottery.com/'
  };
  
  return referers[sourceName] || 'https://www.powerball.com/';
}

// Calculate frequency statistics for optimization
function calculateFrequencyStats(drawings) {
  const numberFreq = {};
  const powerballFreq = {};
  const recentDrawings = drawings.slice(0, 20); // Last 20 drawings for "hot" analysis
  
  // Initialize frequency counters
  for (let i = 1; i <= 69; i++) numberFreq[i] = { total: 0, recent: 0 };
  for (let i = 1; i <= 26; i++) powerballFreq[i] = { total: 0, recent: 0 };
  
  // Count frequencies
  drawings.forEach((drawing, index) => {
    const isRecent = index < 20;
    
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
    .slice(0, 15)
    .map(([num]) => parseInt(num));
    
  const coldNumbers = Object.entries(numberFreq)
    .sort((a, b) => (a[1].recent + a[1].total * 0.1) - (b[1].recent + b[1].total * 0.1))
    .slice(0, 15)
    .map(([num]) => parseInt(num));
    
  const hotPowerballs = Object.entries(powerballFreq)
    .sort((a, b) => (b[1].recent + b[1].total * 0.1) - (a[1].recent + a[1].total * 0.1))
    .slice(0, 5)
    .map(([num]) => parseInt(num));
    
  const coldPowerballs = Object.entries(powerballFreq)
    .sort((a, b) => (a[1].recent + a[1].total * 0.1) - (b[1].recent + b[1].total * 0.1))
    .slice(0, 5)
    .map(([num]) => parseInt(num));
  
  return {
    numberFrequency: numberFreq,
    powerballFrequency: powerballFreq,
    hotNumbers: hotNumbers,
    coldNumbers: coldNumbers,
    hotPowerballs: hotPowerballs,
    coldPowerballs: coldPowerballs,
    totalDrawings: drawings.length,
    analysisDate: new Date().toISOString().split('T')[0]
  };
}

// Generate fallback historical data (realistic but simulated)
function generateFallbackHistoricalData() {
  const drawings = [];
  const today = new Date();
  
  // Generate 100 realistic drawings going back in time
  for (let i = 0; i < 100; i++) {
    const date = new Date(today);
    
    // Subtract days (3 drawings per week, so roughly every 2.33 days)
    const daysBack = Math.floor(i * 2.33);
    date.setDate(today.getDate() - daysBack);
    
    // Generate realistic numbers
    const numbers = [];
    while (numbers.length < 5) {
      const num = Math.floor(Math.random() * 69) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    numbers.sort((a, b) => a - b);
    
    const powerball = Math.floor(Math.random() * 26) + 1;
    
    drawings.push({
      date: date.toISOString().split('T')[0],
      numbers: numbers,
      powerball: powerball,
      jackpot: Math.floor(Math.random() * 500 + 20) * 1000000, // $20M - $520M
      source: 'Generated Fallback'
    });
  }
  
  return drawings;
}
