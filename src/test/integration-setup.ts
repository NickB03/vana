/**
 * Integration Test Setup
 *
 * This setup uses a REAL local Supabase instance instead of mocks.
 * Run `supabase start` before running integration tests.
 *
 * Usage: npm run test:integration
 */

import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// localStorage Mock for Supabase Auth
// ============================================================================
// The @supabase/auth-js client requires a proper Storage interface.
// jsdom's localStorage doesn't fully implement the Storage interface that
// Supabase expects, causing "storage.getItem is not a function" errors.
// This provides a complete in-memory implementation.

const localStorageData: Record<string, string> = {};

const localStorageMock: Storage = {
  getItem: (key: string): string | null => {
    return localStorageData[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    localStorageData[key] = value;
  },
  removeItem: (key: string): void => {
    delete localStorageData[key];
  },
  clear: (): void => {
    Object.keys(localStorageData).forEach(key => delete localStorageData[key]);
  },
  key: (index: number): string | null => {
    const keys = Object.keys(localStorageData);
    return keys[index] ?? null;
  },
  get length(): number {
    return Object.keys(localStorageData).length;
  },
};

// Install the mock before any Supabase clients are created
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Real Supabase client for integration tests
// These are the default local Supabase credentials from `supabase start`
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';

// Use service_role key for integration tests to bypass RLS
// This is safe because we're testing against LOCAL Supabase only
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Export real client for tests to use
// Using service_role to bypass RLS for test data creation
export const testSupabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test user credentials
export const TEST_USER = {
  email: 'test@example.com',
  password: 'test-password-123',
};

// Store test user ID once created
let testUserId: string | null = null;

// Track created test data for cleanup
const createdSessionIds: string[] = [];
const createdMessageIds: string[] = [];

/**
 * Register a session ID for cleanup after tests
 */
export function trackSession(sessionId: string) {
  createdSessionIds.push(sessionId);
}

/**
 * Register a message ID for cleanup after tests
 */
export function trackMessage(messageId: string) {
  createdMessageIds.push(messageId);
}

/**
 * Create a test chat session
 * @param userId - Required user ID (use generateTestUserId() if you don't have one)
 */
export async function createTestSession(userId: string) {
  const { data, error } = await testSupabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      title: `Test Session ${Date.now()}`,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create test session: ${error.message}`);

  trackSession(data.id);
  return data;
}

/**
 * Get or create a test user ID
 * Creates a real user in auth.users if needed (required for FK constraints)
 */
export async function getTestUserId(): Promise<string> {
  if (testUserId) return testUserId;

  // Try to get existing test user first
  const { data: { users }, error: listError } = await testSupabase.auth.admin.listUsers();

  if (!listError && users) {
    const existingUser = users.find(u => u.email === TEST_USER.email);
    if (existingUser) {
      testUserId = existingUser.id;
      return testUserId;
    }
  }

  // Create test user if it doesn't exist
  const { data, error } = await testSupabase.auth.admin.createUser({
    email: TEST_USER.email,
    password: TEST_USER.password,
    email_confirm: true, // Auto-confirm for testing
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  testUserId = data.user.id;
  return testUserId;
}

/**
 * Create a test message
 */
export async function createTestMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
  const { data, error } = await testSupabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create test message: ${error.message}`);

  trackMessage(data.id);
  return data;
}

// Cleanup after each test
afterEach(async () => {
  // Clean up test data in reverse order (messages before sessions due to FK)
  if (createdMessageIds.length > 0) {
    await testSupabase
      .from('chat_messages')
      .delete()
      .in('id', createdMessageIds);
    createdMessageIds.length = 0;
  }

  if (createdSessionIds.length > 0) {
    await testSupabase
      .from('chat_sessions')
      .delete()
      .in('id', createdSessionIds);
    createdSessionIds.length = 0;
  }
});

// Verify Supabase is running before tests
beforeAll(async () => {
  try {
    const { error } = await testSupabase.from('chat_sessions').select('id').limit(1);
    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }
    console.log('✅ Connected to local Supabase');
  } catch (e) {
    console.error('❌ Failed to connect to Supabase. Is `supabase start` running?');
    console.error('   Run: supabase start');
    throw e;
  }
});

// Only mock browser APIs that don't exist in Node
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Sentry (external service, not testing this)
vi.mock('@sentry/react', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  init: vi.fn(),
}));

// DO NOT mock @supabase/supabase-js - we want real database operations!
