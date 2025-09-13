// Circuit Breaker Debug Console Script
// Paste this into browser dev console to debug and reset circuit breaker

console.log('🔧 Circuit Breaker Debug Tool Starting...');

const debugCircuitBreaker = async () => {
  try {
    // Try to import api client utils 
    const { apiClientUtils } = await import('/lib/api-client.ts');
    
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
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${base}/health`, { credentials: 'include' });
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
    
    const { status: healthStatus } = await response.json().catch(() => ({ status: 'unknown' }));
    return {
      circuitBreakerStatus: apiClientUtils.getCircuitBreakerStatus(),
      backendHealthy: healthStatus === 'healthy',
      ready: healthStatus === 'healthy'
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