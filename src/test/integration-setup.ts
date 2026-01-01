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

// Real Supabase client for integration tests
// These are the default local Supabase credentials from `supabase start`
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Export real client for tests to use
export const testSupabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user credentials (create via Supabase dashboard or seed script)
export const TEST_USER = {
  email: 'test@example.com',
  password: 'test-password-123',
};

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
 */
export async function createTestSession(userId?: string) {
  const { data, error } = await testSupabase
    .from('chat_sessions')
    .insert({
      user_id: userId || null,
      title: `Test Session ${Date.now()}`,
      guest_session_id: userId ? null : `guest-${Date.now()}`,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create test session: ${error.message}`);

  trackSession(data.id);
  return data;
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
