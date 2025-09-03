/**
 * Global test teardown for integration tests
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('Tearing down integration test environment...');

  // Clean up test files
  try {
    const tempDir = path.join(__dirname, '../temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn('Warning: Could not clean temp directory during teardown:', error.message);
  }

  // Clean up environment variables
  delete process.env.GOOGLE_CLOUD_PROJECT;
  delete process.env.VANA_BASE_URL;
  delete process.env.NEXT_PUBLIC_USE_VERCEL_AI;
  delete process.env.REQUIRE_SSE_AUTH;

  console.log('Integration test environment teardown complete.');
};