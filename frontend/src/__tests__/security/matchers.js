/**
 * Security Test Custom Matchers
 * Custom Jest matchers for security testing
 */

// Extend Jest matchers for security tests
expect.extend({
  toBeSecureUrl(received) {
    const pass = /^https:\/\//.test(received) && !received.includes('javascript:') && !received.includes('data:');
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a secure URL`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a secure URL (HTTPS, no javascript: or data: schemes)`,
        pass: false,
      };
    }
  },
  
  toContainXSS(received) {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /alert\s*\(/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
    ];
    
    const hasXSS = xssPatterns.some(pattern => pattern.test(received));
    
    return {
      message: () => hasXSS 
        ? `expected ${received} not to contain XSS patterns`
        : `expected ${received} to contain XSS patterns`,
      pass: hasXSS,
    };
  },
  
  toBeValidCSPPolicy(received) {
    const requiredDirectives = ['default-src', 'script-src', 'style-src', 'object-src'];
    const dangerousValues = ["'unsafe-inline'", "'unsafe-eval'", '*', 'data:', 'javascript:'];
    
    const hasRequiredDirectives = requiredDirectives.every(directive => 
      received.includes(directive)
    );
    
    const hasDangerousValues = dangerousValues.some(value => 
      received.includes(value)
    );
    
    const isValid = hasRequiredDirectives && !hasDangerousValues;
    
    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid CSP policy`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid CSP policy (required directives: ${requiredDirectives.join(', ')}, no dangerous values)`,
        pass: false,
      };
    }
  },
  
  toHaveSecurityHeaders(received) {
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options', 
      'X-XSS-Protection',
      'Strict-Transport-Security'
    ];
    
    const missingHeaders = requiredHeaders.filter(header => 
      !received.headers || !received.headers[header]
    );
    
    const pass = missingHeaders.length === 0;
    
    if (pass) {
      return {
        message: () => `expected response not to have security headers`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to have security headers, missing: ${missingHeaders.join(', ')}`,
        pass: false,
      };
    }
  },
  
  toBeValidJWT(received) {
    const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtPattern.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JWT format`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid JWT format`,
        pass: false,
      };
    }
  },
  
  toBeValidNonce(received) {
    const noncePattern = /^[a-f0-9]{32}$/;
    const pass = noncePattern.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid nonce`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid 32-character hex nonce`,
        pass: false,
      };
    }
  },
  
  toHaveBeenCalledWithSanitizedInput(received, expected) {
    const calls = received.mock.calls;
    const lastCall = calls[calls.length - 1];
    
    if (!lastCall) {
      return {
        message: () => `expected function to have been called`,
        pass: false,
      };
    }
    
    const sanitizedInput = lastCall[0];
    const hasXSS = /<script|javascript:|on\w+=/i.test(sanitizedInput);
    
    const pass = !hasXSS;
    
    if (pass) {
      return {
        message: () => `expected function not to be called with sanitized input`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected function to be called with sanitized input, but received: ${sanitizedInput}`,
        pass: false,
      };
    }
  },
});

// Export security test utilities
window.SecurityTestUtils = {
  generateMaliciousPayloads: () => [
    '<script>alert("XSS")</script>',
    '<img src="x" onerror="alert(\'XSS\')" />',
    'javascript:alert("XSS")',
    'data:text/html,<script>alert("XSS")</script>',
    '<svg onload="alert(\'XSS\')" />',
    '<iframe src="javascript:alert(\'XSS\')" />',
    '\'"><script>alert(String.fromCharCode(88,83,83))</script>',
    '<body onload=alert("XSS")>',
  ],
  
  generateCSRFTokens: () => [
    'valid-csrf-token-123',
    'csrf_' + Math.random().toString(36).substr(2, 9),
  ],
  
  generateValidJWTs: () => [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  ],
  
  generateMaliciousJWTs: () => [
    'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.',
    'invalid.jwt.format',
    '',
  ],
  
  simulateNetworkDelay: (ms = 100) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  mockSecureHeaders: () => ({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
  }),
};

console.log('🔒 Security test matchers loaded');
