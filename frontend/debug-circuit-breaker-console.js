// Circuit Breaker Debug Console Script
// Paste this into browser dev console to debug and reset circuit breaker

console.log('🔧 Circuit Breaker Debug Tool Starting...');

const debugCircuitBreaker = async () => {
  try {
    // Try to import api client utils
    const { apiClientUtils } = await import('./lib/api-client');
    
    console.log('📊 Getting circuit breaker status...');
    const status = apiClientUtils.getCircuitBreakerStatus();
    console.log('Circuit Breaker Status:', status);
    
    if (status.state === 'OPEN') {
      console.log('🔄 Circuit breaker is OPEN - resetting...');
      const resetResult = apiClientUtils.resetCircuitBreaker();
      console.log('Reset result:', resetResult);
      
      // Verify reset
      const newStatus = apiClientUtils.getCircuitBreakerStatus();
      console.log('📊 New status after reset:', newStatus);
      
      if (newStatus.state === 'CLOSED') {
        console.log('✅ Circuit breaker successfully reset to CLOSED state');
      } else {
        console.log('❌ Circuit breaker reset failed');
      }
    } else {
      console.log('✅ Circuit breaker is not OPEN (state: ' + status.state + ')');
    }
    
    // Test backend connectivity
    console.log('🔍 Testing backend connectivity...');
    const response = await fetch('http://127.0.0.1:8000/health');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is responding:', data.status);
    } else {
      console.log('❌ Backend response error:', response.status);
    }
    
    // Clear cache as well
    console.log('🧹 Clearing API cache...');
    apiClientUtils.clearCache();
    console.log('✅ Cache cleared');
    
    return {
      circuitBreakerStatus: apiClientUtils.getCircuitBreakerStatus(),
      backendHealthy: response.ok,
      ready: true
    };
    
  } catch (error) {
    console.error('❌ Error in debug tool:', error);
    console.log('💡 Try: await import("./lib/api-client")');
    return { error: error.message, ready: false };
  }
};

// Execute and return result
debugCircuitBreaker().then(result => {
  console.log('🎯 Debug Summary:', result);
  if (result.ready && result.circuitBreakerStatus.state === 'CLOSED' && result.backendHealthy) {
    console.log('🚀 System ready for login attempts');
  } else {
    console.log('⚠️  Issues detected - check output above');
  }
});