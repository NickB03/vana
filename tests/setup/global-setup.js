/**
 * Global test setup for integration tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('Setting up integration test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.CI = 'true';
  process.env.GOOGLE_CLOUD_PROJECT = 'test-project-integration';
  process.env.VANA_BASE_URL = 'http://localhost:8000';
  process.env.NEXT_PUBLIC_USE_VERCEL_AI = 'false';
  process.env.REQUIRE_SSE_AUTH = 'false';

  // Create test directories
  const testDirs = [
    path.join(__dirname, '../coverage'),
    path.join(__dirname, '../logs'),
    path.join(__dirname, '../temp')
  ];

  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Clean up any existing test files
  try {
    const tempDir = path.join(__dirname, '../temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.mkdirSync(tempDir, { recursive: true });
    }
  } catch (error) {
    console.warn('Warning: Could not clean temp directory:', error.message);
  }

  console.log('Integration test environment setup complete.');
};