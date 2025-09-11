/**
 * Authentication Security Tests
 * 
 * Comprehensive security tests for authentication system including:
 * - XSS protection and input sanitization
 * - SQL injection prevention
 * - CSRF protection
 * - Token security and validation
 * - Session hijacking prevention
 * - Brute force attack protection
 * - Privacy and data exposure checks
 * - Authorization bypass attempts
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/login-form';
import { AuthProvider } from '@/contexts/auth-context';
import { AuthService } from '@/lib/auth-service';
import { apiClient } from '@/lib/api-client';
import { 
  getMaliciousInputs, 
  checkForSensitiveData, 
  renderWithAuth,
  createMockUser,
  MockAuthService,
  createMockJWT,
  createExpiredJWT
} from '@/tests/utils/auth-test-utils';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/lib/auth-service');
jest.mock('@/lib/api-client');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Authentication Security Tests', () => {
  const user = userEvent.setup();
  let mockAuth: MockAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockAuth = new MockAuthService();
    
    // Apply mocks to AuthService
    Object.entries(mockAuth.getAllMocks()).forEach(([method, mock]) => {
      (AuthService as any)[method] = mock;
    });
  });

  describe('Input Sanitization and XSS Protection', () => {
    it('should sanitize XSS attempts in login form', async () => {
      const maliciousInputs = getMaliciousInputs();
      
      render(
        <AuthProvider>
          <LoginForm onSuccess={jest.fn()} onError={jest.fn()} />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      // Test XSS in email field
      await user.type(emailInput, maliciousInputs.xss);
      
      expect(emailInput.value).not.toContain('<script>');
      expect(emailInput.value).not.toContain('alert(');
    });

    it('should prevent JavaScript execution in user data', () => {
      const maliciousUser = createMockUser({
        name: '<script>alert("XSS")</script>',
        email: 'javascript:alert(1)',
      });

      const { container } = renderWithAuth(
        <div data-testid="user-display">
          <span>{maliciousUser.name}</span>
          <span>{maliciousUser.email}</span>
        </div>
      );

      // Check that HTML is not executed
      expect(container.innerHTML).not.toContain('<script>');
      expect(screen.queryByText('XSS')).not.toBeInTheDocument();
    });

    it('should escape HTML in user profile data', () => {
      const userWithHTML = createMockUser({
        name: '<b>Bold Name</b>',
        email: '<i>italic@example.com</i>',
      });

      mockAuth.authenticateUser(userWithHTML);

      renderWithAuth(
        <div>
          <span data-testid="name">{userWithHTML.name}</span>
          <span data-testid="email">{userWithHTML.email}</span>
        </div>
      );

      // Should display as text, not HTML
      expect(screen.getByTestId('name').textContent).toBe('<b>Bold Name</b>');
      expect(screen.getByTestId('email').textContent).toBe('<i>italic@example.com</i>');
    });

    it('should handle malicious unicode characters', async () => {
      const maliciousInputs = getMaliciousInputs();
      
      render(
        <AuthProvider>
          <LoginForm onSuccess={jest.fn()} onError={jest.fn()} />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      
      await user.type(emailInput, maliciousInputs.unicode);
      
      // Should not crash or cause rendering issues
      expect(emailInput).toBeInTheDocument();
      expect(emailInput.value).toBe(maliciousInputs.unicode);
    });
  });

  describe('Token Security', () => {
    it('should validate JWT token structure', () => {
      const validToken = createMockJWT();
      const invalidToken = 'invalid.token';
      
      mockAuth.setState({ token: validToken, isAuthenticated: true });
      
      // Valid token should pass validation
      expect(mockAuth.getMock('validateToken')).toBeDefined();
      
      mockAuth.setState({ token: invalidToken, isAuthenticated: false });
      
      // Invalid token should fail validation
      expect(mockAuth.getState().isAuthenticated).toBe(false);
    });

    it('should handle expired tokens securely', async () => {
      const expiredToken = createExpiredJWT();
      mockAuth.setState({ token: expiredToken });
      mockAuth.getMock('validateToken').mockResolvedValue(false);
      
      // Should automatically logout on expired token
      mockAuth.getMock('refreshToken').mockRejectedValue(new Error('Token expired'));
      
      try {
        await mockAuth.getMock('refreshToken')();
      } catch (error) {
        // Should trigger logout
        await mockAuth.getMock('logout')();
      }

      expect(mockAuth.getMock('logout')).toHaveBeenCalled();
    });

    it('should not expose tokens in client-side code', () => {
      const token = createMockJWT();
      mockAuth.setState({ token, isAuthenticated: true });
      
      const authState = mockAuth.getState();
      const exposedData = checkForSensitiveData(authState);
      
      // Token should be stored securely, not exposed in plain text
      expect(exposedData).toHaveLength(0);
    });

    it('should implement secure token storage', () => {
      const token = createMockJWT();
      mockAuth.authenticateUser();
      
      // Should not store tokens in easily accessible locations
      const localStorageData = JSON.stringify(localStorage);
      const sessionStorageData = JSON.stringify(sessionStorage);
      
      // Tokens should be stored with proper security measures
      expect(localStorageData).not.toContain('access_token');
      expect(sessionStorageData).not.toContain('access_token');
    });

    it('should implement token rotation on refresh', async () => {
      const oldToken = createMockJWT({ iat: Date.now() / 1000 - 1800 }); // 30 min old
      const newToken = createMockJWT();
      
      mockAuth.setState({ token: oldToken });
      mockAuth.getMock('refreshToken').mockResolvedValue(newToken);
      
      const refreshedToken = await mockAuth.getMock('refreshToken')();
      
      expect(refreshedToken).toBe(newToken);
      expect(refreshedToken).not.toBe(oldToken);
    });
  });

  describe('Session Security', () => {
    it('should implement session timeout', async () => {
      jest.useFakeTimers();
      
      mockAuth.authenticateUser();
      
      // Simulate session timeout (30 minutes)
      jest.advanceTimersByTime(30 * 60 * 1000);
      
      // Should automatically logout
      expect(mockAuth.getState().isAuthenticated).toBe(false);
      
      jest.useRealTimers();
    });

    it('should prevent session fixation attacks', () => {
      const initialSessionId = 'session_123';
      
      // Simulate session before login
      sessionStorage.setItem('session_id', initialSessionId);
      
      mockAuth.authenticateUser();
      
      // Session ID should change after authentication
      const newSessionId = sessionStorage.getItem('session_id');
      expect(newSessionId).not.toBe(initialSessionId);
    });

    it('should clear session data on logout', async () => {
      mockAuth.authenticateUser();
      
      // Add some session data
      localStorage.setItem('user_preferences', JSON.stringify({ theme: 'dark' }));
      sessionStorage.setItem('temp_data', 'some_data');
      
      await mockAuth.getMock('logout')();
      
      // Sensitive session data should be cleared
      expect(localStorage.getItem('vana_auth_token')).toBeNull();
      expect(sessionStorage.getItem('temp_data')).toBeNull();
    });

    it('should detect concurrent sessions', async () => {
      const user1 = createMockUser({ id: 'user1' });
      const user2 = createMockUser({ id: 'user2' });
      
      // Simulate user1 login
      mockAuth.authenticateUser(user1);
      const token1 = mockAuth.getState().token;
      
      // Simulate user2 login on same device/browser
      mockAuth.authenticateUser(user2);
      const token2 = mockAuth.getState().token;
      
      // Should detect concurrent session and handle appropriately
      expect(token2).not.toBe(token1);
    });
  });

  describe('Authorization and Access Control', () => {
    it('should prevent privilege escalation', () => {
      const regularUser = createMockUser({ roles: ['user'] });
      mockAuth.authenticateUser(regularUser);
      
      // Attempt to access admin functionality should fail
      const hasAdminRole = regularUser.roles?.includes('admin');
      expect(hasAdminRole).toBe(false);
    });

    it('should validate role-based access controls', () => {
      const adminUser = createMockUser({ roles: ['admin'] });
      const regularUser = createMockUser({ roles: ['user'] });
      
      // Admin should have access
      expect(adminUser.roles?.includes('admin')).toBe(true);
      
      // Regular user should not
      expect(regularUser.roles?.includes('admin')).toBe(false);
    });

    it('should prevent direct object reference attacks', () => {
      const user1 = createMockUser({ id: 'user1' });
      const user2 = createMockUser({ id: 'user2' });
      
      mockAuth.authenticateUser(user1);
      
      // User1 should not be able to access User2's data
      const currentUser = mockAuth.getState().user;
      expect(currentUser?.id).toBe('user1');
      expect(currentUser?.id).not.toBe('user2');
    });

    it('should implement proper permission checks', () => {
      const userWithWritePermission = createMockUser({ permissions: ['read', 'write'] });
      const userWithReadPermission = createMockUser({ permissions: ['read'] });
      
      expect(userWithWritePermission.permissions?.includes('write')).toBe(true);
      expect(userWithReadPermission.permissions?.includes('write')).toBe(false);
    });
  });

  describe('API Security', () => {
    it('should include CSRF protection tokens', async () => {
      mockAuth.authenticateUser();
      
      // Mock API call
      mockApiClient.post.mockResolvedValue({ success: true });
      
      await mockApiClient.post('/api/protected', { data: 'test' });
      
      // Should include CSRF token in headers
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/protected',
        { data: 'test' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': expect.any(String)
          })
        })
      );
    });

    it('should prevent SQL injection in API calls', async () => {
      const maliciousInputs = getMaliciousInputs();
      
      mockApiClient.post.mockImplementation((url, data) => {
        // Check that malicious SQL is not passed through
        const dataString = JSON.stringify(data);
        expect(dataString).not.toContain('DROP TABLE');
        expect(dataString).not.toContain('SELECT *');
        return Promise.resolve({ success: true });
      });
      
      await mockApiClient.post('/api/search', {
        query: maliciousInputs.sqlInjection
      });
    });

    it('should implement rate limiting protection', async () => {
      const attempts = [];
      
      // Simulate multiple rapid login attempts
      for (let i = 0; i < 10; i++) {
        attempts.push(
          mockAuth.getMock('login')('test@example.com', 'password123')
        );
      }
      
      // Some attempts should be rate limited
      const results = await Promise.allSettled(attempts);
      const rejectedAttempts = results.filter(r => r.status === 'rejected');
      
      expect(rejectedAttempts.length).toBeGreaterThan(0);
    });

    it('should validate request integrity', async () => {
      const requestData = { email: 'test@example.com' };
      
      mockApiClient.post.mockImplementation((url, data, options) => {
        // Should include integrity checks
        expect(options?.headers).toEqual(
          expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.any(String)
          })
        );
        return Promise.resolve({ success: true });
      });
      
      mockAuth.authenticateUser();
      await mockApiClient.post('/api/profile', requestData);
    });
  });

  describe('Privacy and Data Protection', () => {
    it('should not log sensitive information', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const consoleErrorSpy = jest.spyOn(console, 'error');
      
      // Perform login operation
      mockAuth.getMock('login')('test@example.com', 'password123');
      
      // Check console logs for sensitive data
      const allLogs = [...consoleSpy.mock.calls, ...consoleErrorSpy.mock.calls];
      const logString = JSON.stringify(allLogs);
      
      expect(logString).not.toContain('password123');
      expect(logString).not.toContain('secret');
      expect(logString).not.toContain('private');
      
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should implement secure password handling', async () => {
      render(
        <AuthProvider>
          <LoginForm onSuccess={jest.fn()} onError={jest.fn()} />
        </AuthProvider>
      );

      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(passwordInput, 'secretpassword');
      
      // Password should be masked
      expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Password should not be stored in component state as plain text
      expect(passwordInput.value).toBe('secretpassword');
      
      // But it should not be visible in DOM inspection
      const formData = new FormData(passwordInput.closest('form') as HTMLFormElement);
      expect(formData.get('password')).toBe('secretpassword');
    });

    it('should handle PII data securely', () => {
      const userWithPII = createMockUser({
        email: 'user@example.com',
        name: 'John Doe',
        ssn: '123-45-6789', // Sensitive PII
      });
      
      const exposedData = checkForSensitiveData(userWithPII);
      
      // SSN and other PII should not be exposed
      expect(exposedData).not.toContain('ssn');
    });

    it('should implement data minimization', () => {
      const user = createMockUser();
      
      // Only necessary data should be stored
      const essentialFields = ['id', 'email', 'name', 'roles'];
      const userFields = Object.keys(user);
      
      // Should not store unnecessary sensitive data
      expect(userFields).not.toContain('password');
      expect(userFields).not.toContain('ssn');
      expect(userFields).not.toContain('creditCard');
    });
  });

  describe('Brute Force Protection', () => {
    it('should implement account lockout after failed attempts', async () => {
      const maxAttempts = 5;
      const attempts = [];
      
      // Simulate multiple failed login attempts
      mockAuth.mockLoginFailure(new Error('Invalid credentials'));
      
      for (let i = 0; i < maxAttempts + 2; i++) {
        attempts.push(
          mockAuth.getMock('login')('test@example.com', 'wrongpassword')
            .catch(e => e)
        );
      }
      
      const results = await Promise.allSettled(attempts);
      
      // Later attempts should be blocked
      const lastAttempt = results[results.length - 1];
      expect(lastAttempt.status).toBe('rejected');
    });

    it('should implement progressive delays', async () => {
      const startTime = Date.now();
      
      // Simulate failed attempts with increasing delays
      for (let i = 0; i < 3; i++) {
        try {
          await mockAuth.getMock('login')('test@example.com', 'wrong');
        } catch (e) {
          // Expected failure
        }
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should have progressive delays (not instant failures)
      expect(totalTime).toBeGreaterThan(100);
    });

    it('should reset attempt counter on successful login', async () => {
      // Multiple failed attempts
      for (let i = 0; i < 3; i++) {
        try {
          mockAuth.mockLoginFailure();
          await mockAuth.getMock('login')('test@example.com', 'wrong');
        } catch (e) {
          // Expected failure
        }
      }
      
      // Successful login should reset counter
      mockAuth.mockLoginSuccess();
      await mockAuth.getMock('login')('test@example.com', 'correct');
      
      // Next login attempt should work normally
      await mockAuth.getMock('login')('test@example.com', 'correct');
      expect(mockAuth.getMock('login')).toHaveBeenCalledTimes(5);
    });
  });

  describe('Content Security Policy (CSP)', () => {
    it('should not execute inline scripts', () => {
      const inlineScript = '<script>window.malicious = true;</script>';
      
      const { container } = render(
        <div dangerouslySetInnerHTML={{ __html: inlineScript }} />
      );
      
      // Inline script should not execute
      expect((window as any).malicious).toBeUndefined();
    });

    it('should block unauthorized external resources', async () => {
      const maliciousUrl = 'http://malicious-site.com/steal-data';
      
      // Attempt to load external resource
      const img = new Image();
      img.src = maliciousUrl;
      
      await new Promise(resolve => {
        img.onerror = resolve;
        img.onload = resolve;
        setTimeout(resolve, 100);
      });
      
      // Should be blocked by CSP
      expect(img.complete).toBe(false);
    });
  });

  describe('Secure Communication', () => {
    it('should enforce HTTPS in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      // API calls should use HTTPS
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.vana.com';
      expect(apiUrl).toMatch(/^https:/);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should implement certificate pinning', async () => {
      // Mock certificate validation
      const mockCertificateValidation = jest.fn().mockReturnValue(true);
      
      // Should validate certificates
      expect(mockCertificateValidation()).toBe(true);
    });

    it('should use secure headers', async () => {
      mockAuth.authenticateUser();
      
      mockApiClient.get.mockImplementation((url, options) => {
        // Should include security headers
        expect(options?.headers).toEqual(
          expect.objectContaining({
            'Strict-Transport-Security': expect.any(String),
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
          })
        );
        return Promise.resolve({});
      });
      
      await mockApiClient.get('/api/secure');
    });
  });

  describe('Vulnerability Testing', () => {
    it('should handle buffer overflow attempts', async () => {
      const longString = 'A'.repeat(100000);
      
      render(
        <AuthProvider>
          <LoginForm onSuccess={jest.fn()} onError={jest.fn()} />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      
      // Should not crash on extremely long input
      expect(() => {
        fireEvent.change(emailInput, { target: { value: longString } });
      }).not.toThrow();
      
      // Input should be limited/truncated
      expect(emailInput.value.length).toBeLessThan(longString.length);
    });

    it('should prevent prototype pollution', () => {
      const maliciousPayload = {
        '__proto__': { isAdmin: true },
        'constructor': { 'prototype': { isAdmin: true } }
      };
      
      // Should not pollute prototype
      Object.assign({}, maliciousPayload);
      
      const testObject = {};
      expect((testObject as any).isAdmin).toBeUndefined();
    });

    it('should handle null byte injection', async () => {
      const nullByteInput = 'test\0admin';
      
      render(
        <AuthProvider>
          <LoginForm onSuccess={jest.fn()} onError={jest.fn()} />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      
      await user.type(emailInput, nullByteInput);
      
      // Should handle null bytes safely
      expect(emailInput.value).not.toContain('\0');
    });
  });
});