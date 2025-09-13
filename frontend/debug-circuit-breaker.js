// Debug script to test circuit breaker reset
// Run this in browser console on http://localhost:3000

console.log('🔧 Debug: Testing Circuit Breaker...');

// Try to access the apiClient from globals or import
const testCircuitBreaker = async () => {
  try {
    // Check if apiClient is available globally
    if (typeof window !== 'undefined' && window.apiClient) {
      const status = window.apiClient.getCircuitBreakerStatus();
      console.log('📊 Circuit Breaker Status:', status);
      
      if (status.state === 'OPEN') {
        console.log('🔄 Resetting circuit breaker...');
        const resetResult = window.apiClient.resetCircuitBreaker();
        console.log('✅ Reset result:', resetResult);
        
        // Check status again
        const newStatus = window.apiClient.getCircuitBreakerStatus();
        console.log('📊 New Status:', newStatus);
      } else {
        console.log('✅ Circuit breaker is not OPEN');
      }
    } else {
      console.log('❌ apiClient not found in global scope');
      console.log('Available globals:', Object.keys(window).filter(k => k.includes('api') || k.includes('client')));
    }
    
    // Test direct fetch to backend
    console.log('🔍 Testing direct fetch to backend...');
    const response = await fetch('http://127.0.0.1:8000/health');
    const data = await response.json();
    console.log('✅ Direct fetch successful:', data.status);
    
  } catch (error) {
    console.error('❌ Error testing circuit breaker:', error);
  }
};

// Run the test
testCircuitBreaker();