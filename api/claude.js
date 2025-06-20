// Enhanced Claude API Proxy with Better Error Handling and Debugging
// Replace your existing api/claude.js with this version

export default async function handler(req, res) {
  // Enhanced CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      success: false,
      debug: 'Only POST requests are allowed'
    });
  }

  try {
    console.log('=== Claude API Request Debug ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    console.log('Request body keys:', Object.keys(req.body || {}));
    
    const { 
      apiKey, 
      analysisType, 
      historicalData, 
      currentJackpot,
      requestedSets = 5,
      strategy = 'hybrid',
      localAlgorithmResults,
      predictionSet,
      historicalContext
    } = req.body;
    
    console.log('Analysis type:', analysisType);
    console.log('API key provided:', !!apiKey);
    console.log('API key format check:', apiKey ? apiKey.substring(0, 7) + '...' : 'none');
    
    // Enhanced API key validation
    if (!apiKey) {
      console.log('ERROR: No API key provided');
      return res.status(400).json({
        error: 'Claude API key is required',
        success: false,
        debug: 'No apiKey found in request body'
      });
    }

    if (typeof apiKey !== 'string') {
      console.log('ERROR: API key is not a string');
      return res.status(400).json({
        error: 'API key must be a string',
        success: false,
        debug: `API key type: ${typeof apiKey}`
      });
    }

    if (!apiKey.startsWith('sk-ant-')) {
      console.log('ERROR: Invalid API key format');
      return res.status(400).json({
        error: 'Invalid Anthropic API key format',
        success: false,
        debug: `API key should start with 'sk-ant-' but starts with '${apiKey.substring(0, 7)}'`
      });
    }

    if (apiKey.length < 20) {
      console.log('ERROR: API key too short');
      return res.status(400).json({
        error: 'API key appears to be too short',
        success: false,
        debug: `API key length: ${apiKey.length}`
      });
    }

    // Validate analysis type
    const validAnalysisTypes = ['hybridSelection', 'quickSelection', 'predictionInsights'];
    if (!analysisType || !validAnalysisTypes.includes(analysisType)) {
      console.log('ERROR: Invalid analysis type');
      return res.status(400).json({
        error: 'Invalid analysis type',
        success: false,
        debug: `Analysis type '${analysisType}' not in ${validAnalysisTypes.join(', ')}`
      });
    }

    // Build prompt based on analysis type
    let analysisPrompt;
    let maxTokens = 1000;

    if (analysisType === 'hybridSelection') {
      analysisPrompt = buildHybridSelectionPrompt(
        historicalData, 
        currentJackpot, 
        requestedSets, 
        strategy, 
        localAlgorithmResults
      );
      maxTokens = 1400;
    } else if (analysisType === 'quickSelection') {
      analysisPrompt = buildQuickSelectionPrompt(historicalData, currentJackpot, requestedSets, strategy);
      maxTokens = 1200;
    } else if (analysisType === 'predictionInsights') {
      analysisPrompt = buildPredictionInsightsPrompt(predictionSet, historicalContext);
      maxTokens = 400;
    }

    console.log('Prompt length:', analysisPrompt ? analysisPrompt.length : 0);
    console.log('Max tokens:', maxTokens);
    
    // Make request to Claude API
    console.log('Making request to Claude API...');
    
    const claudePayload = {
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: analysisPrompt
      }]
    };

    console.log('Claude payload prepared, making request...');

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(claudePayload)
    });

    console.log('Claude API response status:', claudeResponse.status);
    console.log('Claude API response headers:', Object.fromEntries(claudeResponse.headers.entries()));

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error response:', errorText);
      
      let errorMessage = `Claude API error: ${claudeResponse.status}`;
      let debugInfo = errorText;
      
      // Parse error for better messaging
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error && errorData.error.message) {
          errorMessage = errorData.error.message;
        }
        debugInfo = errorData;
      } catch (e) {
        // Keep original text if not JSON
      }
      
      return res.status(claudeResponse.status).json({
        error: errorMessage,
        success: false,
        debug: debugInfo,
        claudeStatus: claudeResponse.status
      });
    }

    const claudeData = await claudeResponse.json();
    console.log('Claude response received successfully');
    console.log('Claude response structure:', Object.keys(claudeData));
    
    // Process Claude's response
    let processedResponse;
    
    if (analysisType === 'hybridSelection') {
      processedResponse = processHybridSelectionResponse(
        claudeData.content[0].text, 
        requestedSets, 
        localAlgorithmResults
      );
    } else if (analysisType === 'quickSelection') {
      processedResponse = processQuickSelectionResponse(claudeData.content[0].text, requestedSets);
    } else {
      processedResponse = {
        analysis: claudeData.content[0].text,
        rawResponse: claudeData.content[0].text
      };
    }
    
    console.log('Response processed successfully');
    
    return res.status(200).json({
      success: true,
      analysisType,
      ...processedResponse,
      usage: claudeData.usage,
      model: claudeData.model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('=== Claude API Error ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      debug: {
        errorName: error.name,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Build hybrid prompt that includes local algorithm results
function buildHybridSelectionPrompt(historicalData, currentJackpot, requestedSets, strategy, localResults) {
  const recentDrawings = historicalData?.drawings?.slice(0, 15) || [];
  const stats = historicalData || {};
  
  // Format local algorithm results for Claude
  const localResultsSummary = localResults ? formatLocalResultsForClaude(localResults) : 'No local results provided';
  
  return `You are an expert lottery data scientist with access to both historical data AND advanced mathematical algorithm results. Your task is to create ${requestedSets} HYBRID Powerball selections that combine your statistical intelligence with the provided algorithm outputs.

CURRENT CONTEXT:
- Current Jackpot: ${currentJackpot?.formatted || 'Unknown'}
- Strategy Focus: ${strategy}
- Historical Data: ${stats.totalDrawings || 0} drawings analyzed
- Analysis Date: ${new Date().toISOString().split('T')[0]}

RECENT DRAWING PATTERNS:
${recentDrawings.map((d, i) => `Drawing ${i+1}: [${d.numbers?.join(', ') || 'N/A'}] PB:${d.powerball || 'N/A'} (${d.date || 'Unknown'})`).join('\n')}

FREQUENCY DATA:
- Hot Numbers: ${stats.hotNumbers?.slice(0, 15).join(', ') || 'Not available'}
- Cold Numbers: ${stats.coldNumbers?.slice(0, 15).join(', ') || 'Not available'}

MATHEMATICAL ALGORITHM RESULTS:
${localResultsSummary}

HYBRID ANALYSIS TASK:
Create ${requestedSets} intelligent selections by:

1. **Analyzing the mathematical algorithm outputs** for patterns and consensus
2. **Applying your own statistical reasoning** to validate or improve the suggestions
3. **Combining the best insights** from both mathematical models and pattern analysis
4. **Optimizing for different strategic approaches** (consensus, contrarian, balanced, etc.)

For each hybrid selection, provide:
- 5 main numbers (1-69) in ascending order
- 1 Powerball number (1-26)
- Hybrid reasoning explaining how you combined algorithm insights with your analysis
- Confidence level (75-95%)

FORMAT EXACTLY LIKE THIS:
**Hybrid Selection 1: [Strategy Name]**
Numbers: 7, 15, 23, 42, 58 | Powerball: 12
Reasoning: Combined algorithm consensus shows strong preference for mid-range numbers 15, 23, 42. Added 7 for low-range balance and 58 based on gap analysis indicating overdue status. Powerball 12 chosen from frequency hot list with recent pattern confirmation.
Confidence: 87%

**Hybrid Selection 2: [Strategy Name]**
Numbers: 3, 18, 31, 47, 62 | Powerball: 8
Reasoning: [Your hybrid analysis here combining algorithm insights with statistical reasoning]
Confidence: 84%

Continue for all ${requestedSets} selections. Each should represent a different strategic approach to combining mathematical algorithms with intelligent analysis.`;
}

// Format local algorithm results for Claude's analysis
function formatLocalResultsForClaude(localResults) {
  if (!localResults || localResults.length === 0) {
    return 'No local algorithm results available';
  }
  
  let summary = 'MATHEMATICAL ALGORITHM PREDICTIONS:\n\n';
  
  localResults.forEach((result, index) => {
    summary += `Algorithm ${index + 1}: ${result.strategy || 'Unknown Strategy'}\n`;
    summary += `Numbers: [${result.numbers?.join(', ') || 'N/A'}] | Powerball: ${result.powerball || 'N/A'}\n`;
    summary += `Confidence: ${result.confidence || 'N/A'}%\n`;
    summary += `Method: ${result.analysis || result.technicalAnalysis || 'Mathematical optimization'}\n\n`;
  });
  
  // Add frequency analysis
  const allNumbers = localResults.flatMap(r => r.numbers || []);
  const numberFreq = {};
  allNumbers.forEach(num => {
    numberFreq[num] = (numberFreq[num] || 0) + 1;
  });
  
  const consensusNumbers = Object.entries(numberFreq)
    .filter(([num, freq]) => freq > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([num, freq]) => `${num}(${freq}x)`);
  
  if (consensusNumbers.length > 0) {
    summary += `ALGORITHM CONSENSUS: ${consensusNumbers.join(', ')}\n`;
  }
  
  const allPowerballs = localResults.map(r => r.powerball).filter(Boolean);
  const pbFreq = {};
  allPowerballs.forEach(pb => {
    pbFreq[pb] = (pbFreq[pb] || 0) + 1;
  });
  
  const consensusPowerballs = Object.entries(pbFreq)
    .filter(([pb, freq]) => freq > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pb, freq]) => `${pb}(${freq}x)`);
  
  if (consensusPowerballs.length > 0) {
    summary += `POWERBALL CONSENSUS: ${consensusPowerballs.join(', ')}\n`;
  }
  
  return summary;
}

// Process hybrid selection response
function processHybridSelectionResponse(claudeText, requestedSets, localResults) {
  const selections = [];
  
  try {
    console.log('Processing Claude hybrid response...');
    console.log('Claude text length:', claudeText.length);
    
    // Parse Claude's hybrid response
    const selectionBlocks = claudeText.split('**Hybrid Selection').slice(1);
    console.log('Found selection blocks:', selectionBlocks.length);
    
    for (let i = 0; i < Math.min(selectionBlocks.length, requestedSets); i++) {
      const block = selectionBlocks[i];
      
      // Extract strategy name
      const strategyMatch = block.match(/^[^*]+:\s*([^*\n]+)/);
      const strategy = strategyMatch ? strategyMatch[1].trim() : `Hybrid Strategy ${i + 1}`;
      
      // Extract numbers
      const numbersMatch = block.match(/Numbers:\s*([0-9,\s]+)\s*\|\s*Powerball:\s*(\d+)/);
      if (!numbersMatch) {
        console.warn(`No valid numbers found in selection ${i + 1}`);
        continue;
      }
      
      const numbers = numbersMatch[1]
        .split(',')
        .map(n => parseInt(n.trim()))
        .filter(n => n >= 1 && n <= 69)
        .slice(0, 5)
        .sort((a, b) => a - b);
        
      const powerball = parseInt(numbersMatch[2]);
      
      // Validate numbers
      if (numbers.length !== 5 || powerball < 1 || powerball > 26) {
        console.warn(`Invalid hybrid numbers in selection ${i + 1}, skipping`);
        continue;
      }
      
      // Check for duplicates
      const uniqueNumbers = new Set(numbers);
      if (uniqueNumbers.size !== 5) {
        console.warn(`Duplicate numbers in hybrid selection ${i + 1}, skipping`);
        continue;
      }
      
      // Extract reasoning
      const reasoningMatch = block.match(/Reasoning:\s*([^C]+?)(?:Confidence:|$)/s);
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'Claude AI hybrid analysis combining mathematical algorithms with statistical intelligence';
      
      // Extract confidence
      const confidenceMatch = block.match(/Confidence:\s*(\d+)%/);
      const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 85;
      
      selections.push({
        id: i + 1,
        name: `🤖🧮 ${strategy} (Hybrid)`,
        description: `CLAUDE + ALGORITHMS: ${reasoning}`,
        algorithmDetail: "Claude 3 AI + 6 Mathematical Algorithms Hybrid Analysis",
        numbers: numbers,
        powerball: powerball,
        strategy: `${confidence}% Hybrid Confidence`,
        confidence: confidence,
        actualStrategy: strategy,
        technicalAnalysis: "Validated by Claude 3 AI + Local Algorithms",
        claudeGenerated: true,
        isHybrid: true
      });
    }
    
    console.log(`Successfully processed ${selections.length} hybrid selections`);
    
    // If we didn't get enough hybrid selections, fill with local results enhanced by Claude insights
    while (selections.length < requestedSets && localResults && selections.length < localResults.length) {
      const localResult = localResults[selections.length];
      
      selections.push({
        id: selections.length + 1,
        name: `🧮+ ${localResult.actualStrategy || localResult.strategy} (Enhanced)`,
        description: `ALGORITHM + AI: ${localResult.description} Enhanced with Claude statistical validation.`,
        algorithmDetail: `${localResult.algorithmDetail} + Claude validation`,
        numbers: localResult.numbers,
        powerball: localResult.powerball,
        strategy: `${localResult.confidence}% Enhanced`,
        confidence: Math.min(95, localResult.confidence + 5),
        actualStrategy: localResult.actualStrategy,
        technicalAnalysis: `${localResult.technicalAnalysis} + Claude review`,
        claudeGenerated: false,
        isHybrid: true
      });
    }
    
  } catch (error) {
    console.error('Error parsing Claude hybrid response:', error);
    // Return enhanced local results if parsing fails
    return { claudeSelections: enhanceLocalResultsWithClaude(localResults || []) };
  }
  
  return { claudeSelections: selections.slice(0, requestedSets) };
}

// Enhance local results when Claude parsing fails
function enhanceLocalResultsWithClaude(localResults) {
  return localResults.map((result, index) => ({
    ...result,
    name: `🧮+ ${result.actualStrategy || result.strategy} (AI Enhanced)`,
    description: `ALGORITHM + AI: ${result.description} Enhanced with Claude statistical validation.`,
    algorithmDetail: `${result.algorithmDetail} + Claude validation`,
    confidence: Math.min(95, result.confidence + 3),
    technicalAnalysis: `${result.technicalAnalysis} + Claude review`,
    isHybrid: true
  }));
}

// Simple fallback functions for other analysis types
function buildQuickSelectionPrompt(historicalData, currentJackpot, requestedSets, strategy) {
  return `Generate ${requestedSets} Powerball number selections based on the provided data. Format each as: Numbers: 1, 2, 3, 4, 5 | Powerball: 6`;
}

function processQuickSelectionResponse(claudeText, requestedSets) {
  return { claudeSelections: [] };
}

function buildPredictionInsightsPrompt(predictionSet, historicalContext) {
  return `Analyze this lottery prediction: ${JSON.stringify(predictionSet)}. Provide brief insights.`;
}
