/**
 * DOMPurify Mock for Security Tests
 * Mock implementation of isomorphic-dompurify for testing
 */

const DOMPurify = {
  sanitize: jest.fn((dirty, config) => {
    // Simple sanitization logic for testing
    let clean = dirty;
    
    // Remove script tags
    clean = clean.replace(/<script[^>]*>.*?<\/script>/gi, '');
    
    // Remove event handlers
    clean = clean.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove javascript: URLs
    clean = clean.replace(/javascript:/gi, '');
    
    // Remove data: URLs in certain contexts
    if (config && config.FORBID_TAGS && config.FORBID_TAGS.includes('script')) {
      clean = clean.replace(/<script/gi, '&lt;script');
    }
    
    return clean;
  }),
  
  addHook: jest.fn(),
  removeHook: jest.fn(),
  removeHooks: jest.fn(),
  isValidAttribute: jest.fn(() => true),
};

// Named export
module.exports = {
  sanitize: DOMPurify.sanitize,
  addHook: DOMPurify.addHook,
  removeHook: DOMPurify.removeHook,
  removeHooks: DOMPurify.removeHooks,
  isValidAttribute: DOMPurify.isValidAttribute,
  __esModule: true,
};

// Default export
module.exports.default = DOMPurify;
