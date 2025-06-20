// api/claude.js - Proxy endpoint for Claude AI integration
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

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      success: false
    });
  }

  try {
    console.log('=== Claude API Proxy Request ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Extract API key and request data from frontend
    const { apiKey, prompt, predictionSet, historicalContext } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        error: 'API key is required',
        success: false
      });
    }

    if (!apiKey.startsWith('sk-ant-')) {
      return res.status(400).json({
        error: 'Invalid Anthropic API key format',
        success: false
      });
    }

    // Build the analysis prompt
    const analysisPrompt = buildAnalysisPrompt(predictionSet, historicalContext, prompt);
    
    console.log('Sending request to Claude API...');
    console.log('Prompt:', analysisPrompt);
    
    // Make request to Claude API from server-side
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `You are an expert data scientist specializing in lottery pattern analysis. Provide clear, statistical insights about number selections without making unrealistic promises about winning.

${analysisPrompt}

Respond with 2-3 sentences explaining the mathematical reasoning behind this selection.`
        }]
      })
    });

    console.log('Claude API response status:', claudeResponse.status);
    
    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', errorText);
      
      return res.status(claudeResponse.status).json({
        error: `Claude API error: ${claudeResponse.status}`,
        details: errorText,
        success: false
      });
    }

    const claudeData = await claudeResponse.json();
    console.log('Claude API success response:', claudeData);
    
    // Return the Claude response to frontend
    return res.status(200).json({
      success: true,
      analysis: claudeData.content[0].text,
      usage: claudeData.usage,
      model: claudeData.model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Claude proxy error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Helper function to build analysis prompt
function buildAnalysisPrompt(predictionSet, historicalContext, customPrompt) {
  if (customPrompt) {
    return customPrompt;
  }
  
  if (!predictionSet) {
    return 'Provide general lottery analysis insights.';
  }
  
  return `Lottery prediction analysis:
Numbers: ${predictionSet.numbers ? predictionSet.numbers.join(', ') : 'N/A'} | Powerball: ${predictionSet.powerball || 'N/A'}
Strategy: ${predictionSet.strategy || 'Unknown'}
Confidence: ${predictionSet.confidence || 'N/A'}%

Recent patterns: ${historicalContext?.recentTrends || 'Standard distribution'}
Historical context: ${historicalContext?.totalDrawings || 0} drawings analyzed

Explain the statistical reasoning behind this selection.`;
}