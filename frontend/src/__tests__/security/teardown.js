/**
 * Security Test Teardown
 * Global teardown for security tests
 */

module.exports = async () => {
  // Calculate test execution time
  const executionTime = Date.now() - global.TEST_START_TIME;
  
  // Clean up security test environment
  delete process.env.NEXT_PUBLIC_TEST_MODE;
  delete global.SECURITY_TEST_MODE;
  delete global.TEST_START_TIME;
  
  // Restore console methods
  if (global.console.warn && global.console.warn.mockRestore) {
    global.console.warn.mockRestore();
  }
  if (global.console.error && global.console.error.mockRestore) {
    global.console.error.mockRestore();
  }
  
  // Security test summary
  console.log(`🔒 Security tests completed in ${executionTime}ms`);
  
  // Force cleanup of any remaining handles
  if (global.gc) {
    global.gc();
  }
};
