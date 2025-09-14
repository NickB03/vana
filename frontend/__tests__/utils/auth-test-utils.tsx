/**
 * Authentication Test Utilities
 * 
 * Provides helper functions, mocks, and utilities for testing authentication functionality:
 * - Mock user data generators
 * - Authentication state helpers
 * - Token utilities for testing
 * - Mock implementations
 * - Test data factories
 * - Custom matchers
 */

import { AuthService } from '@/lib/auth-service';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { TEST_CREDENTIALS, TEST_TOKENS, TEST_USERS } from '../constants/test-config';
import { AuthProvider } from '@/contexts/auth-context';

// ============================================================================
// Mock Data Generators
// ============================================================================

export interface MockUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  roles?: string[];
  permissions?: string[];
  createdAt?: string;
  lastLogin?: string;
  isEmailVerified?: boolean;
  preferences?: Record<string, any>;
}

export interface MockAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  user: MockUser;
}

/**
 * Generate a mock user with customizable properties
 */
export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  roles: ['user'],
  permissions: ['read'],
  createdAt: new Date().toISOString(),
  lastLogin: new Date().toISOString(),
  isEmailVerified: true,
  preferences: {},
  ...overrides,
});

/**
 * Generate a mock authentication response
 */
export const createMockAuthResponse = (overrides: Partial<MockAuthResponse> = {}): MockAuthResponse => ({
  access_token: `mock_jwt_token_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: `mock_refresh_token_${Date.now()}`,
  user: createMockUser(overrides.user),
  ...overrides,
});

/**
 * Generate a valid JWT-like token for testing
 */
export const createMockJWT = (payload: Record<string, any> = {}): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({
    sub: 'user_123',
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    ...payload,
  }));
  const signature = 'mock_signature_' + Math.random().toString(36);
  
  return `${header}.${body}.${signature}`;
};

/**
 * Generate an expired JWT token
 */
export const createExpiredJWT = (): string => {
  return createMockJWT({
    iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
  });
};

// ============================================================================
// Authentication State Helpers
// ============================================================================

export interface AuthTestState {
  isAuthenticated: boolean;
  user: MockUser | null;
  token: string | null;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Create authenticated state for testing
 */
export const createAuthenticatedState = (userOverrides?: Partial<MockUser>): AuthTestState => {
  const user = createMockUser(userOverrides);
  return {
    isAuthenticated: true,
    user,
    token: createMockJWT({ sub: user.id, email: user.email }),
    isLoading: false,
    error: null,
  };
};

/**
 * Create unauthenticated state for testing
 */
export const createUnauthenticatedState = (): AuthTestState => ({
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: false,
  error: null,
});

/**
 * Create loading state for testing
 */
export const createLoadingState = (): AuthTestState => ({
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: true,
  error: null,
});

/**
 * Create error state for testing
 */
export const createErrorState = (error: string): AuthTestState => ({
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: false,
  error,
});

// ============================================================================
// Mock Implementations
// ============================================================================

/**
 * Mock AuthService with configurable behavior
 */
export class MockAuthService {
  private state: AuthTestState;
  private mockImplementations: Record<string, jest.Mock>;

  constructor(initialState: AuthTestState = createUnauthenticatedState()) {
    this.state = initialState;
    this.mockImplementations = {
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      isAuthenticated: jest.fn(),
      getToken: jest.fn(),
      getUser: jest.fn(),
      validateToken: jest.fn(),
      getTokenExpiry: jest.fn(),
    };

    this.setupDefaultMocks();
  }

  private setupDefaultMocks() {
    this.mockImplementations.isAuthenticated.mockImplementation(() => this.state.isAuthenticated);
    this.mockImplementations.getToken.mockImplementation(() => this.state.token);
    this.mockImplementations.getUser.mockImplementation(() => this.state.user);
    this.mockImplementations.validateToken.mockImplementation(() => Promise.resolve(this.state.isAuthenticated));
    this.mockImplementations.getTokenExpiry.mockImplementation(() => {
      if (this.state.token) {
        return Date.now() + 3600000; // 1 hour from now
      }
      return null;
    });

    this.mockImplementations.login.mockImplementation(async (email: string, password: string) => {
      if (email === 'error@example.com') {
        throw new Error('Invalid credentials');
      }
      
      const authResponse = createMockAuthResponse({ user: { email } });
      this.setState(createAuthenticatedState({ email }));
      return authResponse;
    });

    this.mockImplementations.logout.mockImplementation(async () => {
      this.setState(createUnauthenticatedState());
    });

    this.mockImplementations.refreshToken.mockImplementation(async () => {
      if (!this.state.token) {
        throw new Error('No token to refresh');
      }
      
      const newToken = createMockJWT({ sub: this.state.user?.id });
      this.setState({ ...this.state, token: newToken });
      return newToken;
    });
  }

  setState(newState: Partial<AuthTestState>) {
    this.state = { ...this.state, ...newState };
    this.setupDefaultMocks(); // Refresh mocks with new state
  }

  getState(): AuthTestState {
    return { ...this.state };
  }

  getMock(method: string): jest.Mock {
    return this.mockImplementations[method];
  }

  getAllMocks() {
    return { ...this.mockImplementations };
  }

  reset() {
    this.setState(createUnauthenticatedState());
    Object.values(this.mockImplementations).forEach(mock => mock.mockClear());
  }

  // Convenience methods for common test scenarios
  authenticateUser(userOverrides?: Partial<MockUser>) {
    this.setState(createAuthenticatedState(userOverrides));
  }

  unauthenticateUser() {
    this.setState(createUnauthenticatedState());
  }

  setLoading(isLoading: boolean = true) {
    this.setState({ ...this.state, isLoading });
  }

  setError(error: string | null) {
    this.setState({ ...this.state, error });
  }

  // Mock specific behaviors
  mockLoginFailure(error: Error = new Error('Login failed')) {
    this.mockImplementations.login.mockRejectedValue(error);
  }

  mockLoginSuccess(response?: Partial<MockAuthResponse>) {
    const authResponse = createMockAuthResponse(response);
    this.mockImplementations.login.mockResolvedValue(authResponse);
    return authResponse;
  }

  mockTokenRefreshFailure(error: Error = new Error('Token refresh failed')) {
    this.mockImplementations.refreshToken.mockRejectedValue(error);
  }

  mockTokenExpiration() {
    this.mockImplementations.getTokenExpiry.mockReturnValue(Date.now() - 1000); // Already expired
    this.mockImplementations.validateToken.mockResolvedValue(false);
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Custom render function with AuthProvider wrapper
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authState?: AuthTestState;
}

export const renderWithAuth = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { authState = createUnauthenticatedState(), ...renderOptions } = options;

  // Mock AuthService with provided state
  const mockAuthService = new MockAuthService(authState);
  const mocks = mockAuthService.getAllMocks();

  // Apply mocks to AuthService
  Object.entries(mocks).forEach(([method, mock]) => {
    (AuthService as any)[method] = mock;
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    mockAuthService,
    mocks,
  };
};

/**
 * Wait for authentication to complete
 */
export const waitForAuth = async () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

/**
 * Simulate user authentication flow
 */
export const simulateLogin = async (
  mockAuthService: MockAuthService,
  credentials: { email: string; password: string } = TEST_CREDENTIALS.VALID_USER
) => {
  const authResponse = createMockAuthResponse({ user: { email: credentials.email } });
  mockAuthService.getMock('login').mockResolvedValueOnce(authResponse);
  mockAuthService.authenticateUser({ email: credentials.email });
  return authResponse;
};

/**
 * Simulate token refresh
 */
export const simulateTokenRefresh = async (mockAuthService: MockAuthService) => {
  const newToken = createMockJWT();
  mockAuthService.getMock('refreshToken').mockResolvedValueOnce(newToken);
  mockAuthService.setState({ token: newToken });
  return newToken;
};

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Create test data for different user roles
 */
export const createUserByRole = (role: string): MockUser => {
  const baseUser = createMockUser();
  
  switch (role) {
    case 'admin':
      return { 
        ...baseUser, 
        roles: ['admin', 'user'], 
        permissions: ['read', 'write', 'delete', 'admin'],
        email: 'admin@example.com',
        name: 'Admin User'
      };
    case 'moderator':
      return { 
        ...baseUser, 
        roles: ['moderator', 'user'], 
        permissions: ['read', 'write', 'moderate'],
        email: 'moderator@example.com',
        name: 'Moderator User'
      };
    case 'user':
    default:
      return { 
        ...baseUser, 
        roles: ['user'], 
        permissions: ['read'],
        email: 'user@example.com',
        name: 'Regular User'
      };
  }
};

/**
 * Create test credentials for different scenarios
 */
export const getTestCredentials = (scenario: string) => {
  switch (scenario) {
    case 'valid':
      return TEST_CREDENTIALS.VALID_USER;
    case 'invalid':
      return TEST_CREDENTIALS.INVALID_USER;
    case 'malformed_email':
      return TEST_CREDENTIALS.MALFORMED_EMAIL;
    case 'weak_password':
      return { email: 'test@example.com', password: '123' };
    case 'empty':
      return { email: '', password: '' };
    default:
      return TEST_CREDENTIALS.VALID_USER;
  }
};

// ============================================================================
// Custom Jest Matchers
// ============================================================================

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAuthenticated(): R;
      toHaveValidJWT(): R;
      toHaveRole(role: string): R;
      toHavePermission(permission: string): R;
    }
  }
}

/**
 * Custom matchers for authentication testing
 */
export const customMatchers = {
  toBeAuthenticated(received: AuthTestState) {
    const pass = received.isAuthenticated && received.user !== null && received.token !== null;
    
    if (pass) {
      return {
        message: () => `expected state not to be authenticated`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected state to be authenticated`,
        pass: false,
      };
    }
  },

  toHaveValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = typeof received === 'string' && jwtRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected "${received}" not to be a valid JWT`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected "${received}" to be a valid JWT`,
        pass: false,
      };
    }
  },

  toHaveRole(received: MockUser, role: string) {
    const pass = received.roles?.includes(role) ?? false;
    
    if (pass) {
      return {
        message: () => `expected user not to have role "${role}"`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected user to have role "${role}"`,
        pass: false,
      };
    }
  },

  toHavePermission(received: MockUser, permission: string) {
    const pass = received.permissions?.includes(permission) ?? false;
    
    if (pass) {
      return {
        message: () => `expected user not to have permission "${permission}"`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected user to have permission "${permission}"`,
        pass: false,
      };
    }
  },
};

// ============================================================================
// Performance Testing Helpers
// ============================================================================

/**
 * Test concurrent authentication operations
 */
export const testConcurrentAuth = async (
  operation: () => Promise<any>,
  concurrency: number = 5
) => {
  const startTime = performance.now();
  const promises = Array(concurrency).fill(null).map(() => operation());
  
  const results = await Promise.allSettled(promises);
  const endTime = performance.now();
  
  return {
    results,
    duration: endTime - startTime,
    successCount: results.filter(r => r.status === 'fulfilled').length,
    errorCount: results.filter(r => r.status === 'rejected').length,
  };
};

/**
 * Monitor memory usage during auth operations
 */
export const monitorMemoryUsage = (operation: () => void) => {
  const initialMemory = performance.memory?.usedJSHeapSize || 0;
  operation();
  const finalMemory = performance.memory?.usedJSHeapSize || 0;
  
  return {
    initialMemory,
    finalMemory,
    difference: finalMemory - initialMemory,
  };
};

// ============================================================================
// Security Testing Helpers
// ============================================================================

/**
 * Generate malicious input for security testing
 */
export const getMaliciousInputs = () => ({
  xss: '<script>alert("XSS")</script>',
  sqlInjection: "'; DROP TABLE users; --",
  longString: 'a'.repeat(10000),
  nullBytes: 'test\0null',
  unicode: '𝕿𝖊𝖘𝖙 𝖀𝖓𝖎𝖈𝖔𝖉𝖊',
  javascript: 'javascript:alert(1)',
  dataUri: 'data:text/html,<script>alert(1)</script>',
});

/**
 * Test for sensitive data exposure
 */
export const checkForSensitiveData = (object: any): string[] => {
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /private/i,
    /key/i,
    /token.*[0-9a-f]{20,}/i, // Real tokens
  ];
  
  const objectString = JSON.stringify(object);
  const exposedData: string[] = [];
  
  sensitivePatterns.forEach(pattern => {
    if (pattern.test(objectString)) {
      exposedData.push(pattern.source);
    }
  });
  
  return exposedData;
};

export default {
  createMockUser,
  createMockAuthResponse,
  createMockJWT,
  createExpiredJWT,
  createAuthenticatedState,
  createUnauthenticatedState,
  createLoadingState,
  createErrorState,
  MockAuthService,
  renderWithAuth,
  waitForAuth,
  simulateLogin,
  simulateTokenRefresh,
  createUserByRole,
  getTestCredentials,
  customMatchers,
  testConcurrentAuth,
  monitorMemoryUsage,
  getMaliciousInputs,
  checkForSensitiveData,
};