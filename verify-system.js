// Quick verification script for the enhanced lottery system
// This script checks if all required functions are properly defined

console.log('🔍 Enhanced Lottery System - Function Verification');
console.log('================================================');

// List of required functions
const requiredFunctions = [
    'fetchLatestPowerballData',
    'fetchHistoricalData', 
    'initializeUserSession',
    'generateEnhancedHybridSelection',
    'generateClaudeHybridSelection',
    'addManualSelection',
    'updateSelectionResult',
    'deleteSelectionEntry',
    'calculatePerformanceStats',
    'saveSelectionForTracking'
];

// Check if running in browser environment
if (typeof window !== 'undefined') {
    console.log('✅ Browser environment detected');
    
    // Check each function
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ ${funcName} - Defined`);
        } else {
            console.log(`❌ ${funcName} - Not defined or not accessible`);
        }
    });
    
    // Check React availability
    if (typeof React !== 'undefined') {
        console.log('✅ React - Available');
    } else {
        console.log('❌ React - Not available');
    }
    
    // Check if APIs are accessible
    console.log('\n🌐 Testing API Accessibility...');
    
    // Test selection history API
    fetch('/api/selection-history')
        .then(response => {
            if (response.ok) {
                console.log('✅ Selection History API - Accessible');
                return response.json();
            } else {
                console.log('⚠️ Selection History API - HTTP ' + response.status);
                return null;
            }
        })
        .then(data => {
            if (data && data.success) {
                console.log('✅ Selection History API - Functional');
            }
        })
        .catch(error => {
            console.log('❌ Selection History API - Error:', error.message);
        });
    
    // Test enhanced predictions API
    fetch('/api/enhanced-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            historicalData: { totalDrawings: 10 },
            userAnalytics: { totalSelections: 5 },
            requestedSets: 1,
            enhancementLevel: 'basic'
        })
    })
        .then(response => {
            if (response.ok) {
                console.log('✅ Enhanced Predictions API - Accessible');
                return response.json();
            } else {
                console.log('⚠️ Enhanced Predictions API - HTTP ' + response.status);
                return null;
            }
        })
        .then(data => {
            if (data && data.success) {
                console.log('✅ Enhanced Predictions API - Functional');
            }
        })
        .catch(error => {
            console.log('❌ Enhanced Predictions API - Error:', error.message);
        });
    
    // Test Powerball data API
    fetch('/api/powerball')
        .then(response => {
            if (response.ok) {
                console.log('✅ Powerball Data API - Accessible');
                return response.json();
            } else {
                console.log('⚠️ Powerball Data API - HTTP ' + response.status);
                return null;
            }
        })
        .then(data => {
            if (data && data.success) {
                console.log('✅ Powerball Data API - Functional');
            }
        })
        .catch(error => {
            console.log('❌ Powerball Data API - Error:', error.message);
        });
        
} else {
    console.log('❌ Not running in browser environment');
    console.log('ℹ️ This verification script should be run in the browser console');
}

console.log('\n📋 Verification Complete');
console.log('If you see any ❌ errors, please check the console for more details.');
console.log('For full testing, use the test-enhanced-system.html page.');