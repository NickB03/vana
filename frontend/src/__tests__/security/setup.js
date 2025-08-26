/**
 * Security Test Setup
 * Global setup for security tests
 */

const crypto = require('crypto');

module.exports = async () => {
  // Set up security test environment
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_TEST_MODE = 'security';
  
  // Set up crypto polyfills for Node.js environment
  if (!global.crypto) {
    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: (array) => {
          return crypto.randomFillSync(array);
        },
        randomUUID: () => crypto.randomUUID(),
        subtle: {
          digest: async (algorithm, data) => {
            const hash = crypto.createHash(algorithm.replace('-', '').toLowerCase());
            hash.update(data);
            return hash.digest();
          }
        }
      },
      writable: true
    });
  }
  
  // Set up TextEncoder/TextDecoder for Node.js
  if (!global.TextEncoder) {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
  }
  
  // Mock window.alert for XSS tests
  global.alert = jest.fn();
  global.confirm = jest.fn();
  global.prompt = jest.fn();
  
  // Mock console methods to prevent test noise
  global.console.warn = jest.fn();
  global.console.error = jest.fn();
  
  // Set up security test globals
  global.SECURITY_TEST_MODE = true;
  global.TEST_START_TIME = Date.now();
  
  console.log('🔒 Security test environment initialized');
};
