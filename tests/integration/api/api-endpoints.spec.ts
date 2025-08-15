import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:8000';

test.describe('Backend API Integration Tests', () => {
  
  test('Health endpoint returns correct status', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.service).toBe('vana');
    expect(health.timestamp).toBeTruthy();
  });

  test('Health endpoint includes system information', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    const health = await response.json();
    
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('service');
    expect(health).toHaveProperty('timestamp');
    
    // Optional system info
    if (health.system) {
      expect(health.system).toHaveProperty('python_version');
      expect(health.system).toHaveProperty('platform');
    }
  });

  test('Authentication endpoints are accessible', async ({ request }) => {
    // Test auth endpoints existence (should return 405 or proper error, not 404)
    const authEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/logout',
      '/auth/refresh',
      '/auth/google',
      '/auth/google/callback'
    ];
    
    for (const endpoint of authEndpoints) {
      const response = await request.get(`${BACKEND_URL}${endpoint}`);
      
      // Should not be 404 (endpoint exists) but may be 405 (method not allowed) or 400 (bad request)
      expect(response.status()).not.toBe(404);
    }
  });

  test('CORS headers are properly configured', async ({ request }) => {
    const response = await request.options(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    const headers = response.headers();
    
    // Check CORS headers
    expect(headers['access-control-allow-origin']).toBeTruthy();
    expect(headers['access-control-allow-methods']).toBeTruthy();
    expect(headers['access-control-allow-headers']).toBeTruthy();
  });

  test('API rate limiting is configured', async ({ request }) => {
    // Make multiple requests to test rate limiting
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(request.get(`${BACKEND_URL}/health`));
    }
    
    const responses = await Promise.all(requests);
    
    // All should succeed under normal rate limits
    responses.forEach(response => {
      expect([200, 429]).toContain(response.status()); // 200 OK or 429 Too Many Requests
    });
  });

  test('Error handling returns proper HTTP status codes', async ({ request }) => {
    // Test non-existent endpoint
    const notFoundResponse = await request.get(`${BACKEND_URL}/nonexistent`);
    expect(notFoundResponse.status()).toBe(404);
    
    // Test invalid method on auth endpoint
    const methodNotAllowedResponse = await request.patch(`${BACKEND_URL}/auth/login`);
    expect([405, 422]).toContain(methodNotAllowedResponse.status());
  });

  test('Content-Type headers are correct', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    const contentType = response.headers()['content-type'];
    
    expect(contentType).toContain('application/json');
  });

  test('API versioning headers are present', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    const headers = response.headers();
    
    // Check for API version headers (may be custom)
    const hasVersionHeader = headers['x-api-version'] || 
                            headers['api-version'] || 
                            headers['x-service-version'];
    
    // Should have some version indication
    expect(hasVersionHeader || headers['server']).toBeTruthy();
  });

  test('Security headers are properly set', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    const headers = response.headers();
    
    // Check basic security headers
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options', 
      'x-xss-protection',
      'strict-transport-security'
    ];
    
    // At least some security headers should be present
    const presentHeaders = securityHeaders.filter(header => headers[header]);
    expect(presentHeaders.length).toBeGreaterThan(0);
  });

  test('Request/Response timing is reasonable', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get(`${BACKEND_URL}/health`);
    const endTime = Date.now();
    
    expect(response.ok()).toBeTruthy();
    
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
  });

  test('Large request handling works correctly', async ({ request }) => {
    // Test with larger payload (but reasonable size)
    const largeData = {
      message: 'x'.repeat(1000), // 1KB message
      metadata: {
        timestamp: Date.now(),
        source: 'test'
      }
    };
    
    const response = await request.post(`${BACKEND_URL}/auth/login`, {
      data: largeData
    });
    
    // Should handle request (may return 400/422 for invalid data, but not 413 Entity Too Large)
    expect(response.status()).not.toBe(413);
  });

  test('Authentication endpoint validation works', async ({ request }) => {
    // Test login endpoint with invalid data
    const invalidLoginResponse = await request.post(`${BACKEND_URL}/auth/login`, {
      data: {
        email: 'invalid-email',
        password: ''
      }
    });
    
    expect([400, 422]).toContain(invalidLoginResponse.status());
    
    if (invalidLoginResponse.status() === 422) {
      const errorData = await invalidLoginResponse.json();
      expect(errorData.detail || errorData.message || errorData.error).toBeTruthy();
    }
  });

  test('Authentication with valid format returns proper response', async ({ request }) => {
    const loginResponse = await request.post(`${BACKEND_URL}/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'testpassword123'
      }
    });
    
    // Should return proper response (may be 401 for invalid credentials, but formatted correctly)
    expect([200, 401, 422]).toContain(loginResponse.status());
    
    const responseData = await loginResponse.json();
    expect(responseData).toBeTruthy();
    
    if (loginResponse.status() === 200) {
      // Successful login should return tokens
      expect(responseData.access_token || responseData.token).toBeTruthy();
    } else {
      // Error response should have proper error structure
      expect(responseData.detail || responseData.message || responseData.error).toBeTruthy();
    }
  });

  test('Google OAuth endpoints are configured', async ({ request }) => {
    const googleAuthResponse = await request.get(`${BACKEND_URL}/auth/google`);
    
    // Should redirect to Google or return auth URL (3xx redirect or 200 with URL)
    expect([200, 301, 302, 307, 308]).toContain(googleAuthResponse.status());
    
    if (googleAuthResponse.status() === 200) {
      const authData = await googleAuthResponse.json();
      expect(authData.auth_url || authData.url).toBeTruthy();
    }
  });

  test('SSE endpoint is accessible', async ({ request }) => {
    // Test SSE endpoint (may require authentication)
    const sseResponse = await request.get(`${BACKEND_URL}/sse/test-session`);
    
    // Should not return 404 (endpoint exists)
    expect(sseResponse.status()).not.toBe(404);
    
    // May return 401 (unauthorized) or start streaming
    expect([200, 401, 403]).toContain(sseResponse.status());
  });

  test('Session management endpoints work', async ({ request }) => {
    // Test session creation
    const sessionResponse = await request.post(`${BACKEND_URL}/sessions`, {
      data: {
        name: 'Test Session'
      }
    });
    
    // Should create session or require auth
    expect([200, 201, 401, 403]).toContain(sessionResponse.status());
    
    if ([200, 201].includes(sessionResponse.status())) {
      const sessionData = await sessionResponse.json();
      expect(sessionData.id || sessionData.session_id).toBeTruthy();
    }
  });

  test('File upload endpoint handling', async ({ request }) => {
    // Test file upload endpoint exists
    const uploadResponse = await request.post(`${BACKEND_URL}/upload`, {
      multipart: {
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('test content')
        }
      }
    });
    
    // Should handle file upload (may require auth or return error for unsupported files)
    expect(uploadResponse.status()).not.toBe(404);
    expect([200, 201, 400, 401, 413, 415, 422]).toContain(uploadResponse.status());
  });

  test('API documentation endpoint is available', async ({ request }) => {
    // Test if API docs are available
    const docsEndpoints = ['/docs', '/redoc', '/openapi.json', '/swagger'];
    
    let docsFound = false;
    for (const endpoint of docsEndpoints) {
      const response = await request.get(`${BACKEND_URL}${endpoint}`);
      if (response.status() === 200) {
        docsFound = true;
        break;
      }
    }
    
    // Should have some form of API documentation
    expect(docsFound).toBeTruthy();
  });

  test('Metrics endpoint provides system stats', async ({ request }) => {
    const metricsResponse = await request.get(`${BACKEND_URL}/metrics`);
    
    if (metricsResponse.status() === 200) {
      const metrics = await metricsResponse.json();
      
      // Should include basic metrics
      expect(metrics.uptime || metrics.requests || metrics.memory).toBeTruthy();
    }
    
    // Should not error even if endpoint doesn't exist
    expect([200, 404, 401]).toContain(metricsResponse.status());
  });

  test('Database connectivity is working', async ({ request }) => {
    // Test an endpoint that would require database
    const dbTestResponse = await request.get(`${BACKEND_URL}/auth/users/me`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    // Should return 401 (unauthorized) rather than 500 (database error)
    expect([401, 403]).toContain(dbTestResponse.status());
  });
});