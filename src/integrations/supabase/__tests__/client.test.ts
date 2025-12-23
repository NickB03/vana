import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('supabase client wiring', () => {
  const mockUrl = 'https://mock.supabase.co';
  const mockKey = 'test-publishable-key';

  beforeEach(() => {
    vi.resetModules();
    vi.mocked(createClient).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates client with expected auth configuration', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', mockUrl);
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', mockKey);

    await import('../client');

    expect(createClient).toHaveBeenCalledWith(
      mockUrl,
      mockKey,
      expect.objectContaining({
        auth: expect.objectContaining({
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        }),
      })
    );
  });

  it('throws when required env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');

    await expect(import('../client')).rejects.toThrow(
      'Missing Supabase environment variables'
    );
    expect(createClient).not.toHaveBeenCalled();
  });
});
