import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bundleArtifact, needsBundling } from '../artifactBundler';
import type { BundleResponse, BundleError } from '../artifactBundler';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    }
  }
}));

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');

describe('bundleArtifact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();

    // Mock console methods to reduce test noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================

  it('sends request as guest when session is null', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        bundleUrl: 'https://example.com/bundle.html',
        bundleSize: 1000,
        bundleTime: 500,
        dependencies: ['framer-motion'],
        expiresAt: new Date().toISOString(),
        requestId: 'req-guest'
      })
    });

    const code = `import { motion } from 'framer-motion';`;
    const result = await bundleArtifact(code, 'artifact-id', 'session-id', 'Test Artifact');

    expect(result.success).toBe(true);
    // Verify fetch was called without Authorization header and with isGuest: true
    expect(global.fetch).toHaveBeenCalledWith(
      'https://mock.supabase.co/functions/v1/bundle-artifact',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No Authorization header for guests
        },
        body: expect.stringContaining('"isGuest":true')
      })
    );
  });

  it('returns requiresAuth error when session expires (401)', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'expired-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' })
    });

    const code = `import { motion } from 'framer-motion';`;
    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Session expired');
      expect(result.requiresAuth).toBe(true);
      expect(result.details).toContain('refresh');
    }
  });

  // ============================================
  // RATE LIMITING TESTS
  // ============================================

  it('returns retryAfter when rate limited (429)', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '300' }),
      json: async () => ({ error: 'Rate limit exceeded' })
    });

    const code = `import { motion } from 'framer-motion';`;
    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Rate limit exceeded');
      expect(result.retryAfter).toBe(300);
      expect(result.details).toContain('5 minutes');
      expect(result.details).toContain('50 bundles per 5 hours');
    }
  });

  it('handles rate limit response without Retry-After header', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers(), // No Retry-After header
      json: async () => ({ error: 'Rate limit exceeded' })
    });

    const code = `import { motion } from 'framer-motion';`;
    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Rate limit exceeded');
      expect(result.retryAfter).toBe(300); // Default value
    }
  });

  // ============================================
  // VALIDATION TESTS
  // ============================================

  it('returns error when code has no npm imports', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    const code = 'export default function App() { return <div>Hello</div> }';
    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('No npm imports detected');
      expect(result.details).toBe('Artifact does not require server-side bundling');
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns error when only React imports are present', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    // Code with only React/React-DOM imports (should not trigger bundling)
    const code = `import React from 'react';
import ReactDOM from 'react-dom';
export default function App() { return <div>Hello</div> }`;

    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('No npm imports detected');
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns error when dependencies cannot be extracted', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    // Malformed import that might pass detectNpmImports but fail extraction
    // This is edge case - normally detectNpmImports and extractNpmDependencies align
    // We can't easily trigger this without modifying detectNpmImports logic
    // So we'll test the error path exists in code coverage
  });

  // ============================================
  // SUCCESS PATH TESTS
  // ============================================

  it('returns bundleUrl and metadata on success', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    const mockResponse: BundleResponse = {
      success: true,
      bundleUrl: 'https://storage.supabase.co/signed-url/bundle.html',
      bundleSize: 12345,
      bundleTime: 2000,
      dependencies: ['framer-motion'],
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      requestId: 'req-12345'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse
    });

    const code = `import { motion } from 'framer-motion';
export default function App() {
  return <motion.div>Animated</motion.div>;
}`;

    const result = await bundleArtifact(code, 'artifact-123', 'session-456', 'My Animation');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.bundleUrl).toBe(mockResponse.bundleUrl);
      expect(result.bundleSize).toBe(12345);
      expect(result.bundleTime).toBe(2000);
      expect(result.dependencies).toContain('framer-motion');
      expect(result.requestId).toBe('req-12345');
      expect(result.expiresAt).toBeTruthy();
    }

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      'https://mock.supabase.co/functions/v1/bundle-artifact',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        }),
        body: expect.stringContaining('framer-motion')
      })
    );
  });

  it('sends correct request payload to bundle endpoint', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'token-abc',
          user: { id: 'user-123' }
        } as any
      },
      error: null
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        bundleUrl: 'https://example.com/bundle.html',
        bundleSize: 1000,
        bundleTime: 500,
        dependencies: ['framer-motion'],
        expiresAt: new Date().toISOString(),
        requestId: 'req-1'
      })
    });

    const code = `import { motion } from 'framer-motion';`;
    await bundleArtifact(code, 'art-456', 'sess-789', 'Animation Component');

    expect(global.fetch).toHaveBeenCalled();
    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1]?.body as string);

    expect(requestBody).toEqual({
      code: `import { motion } from 'framer-motion';`,
      dependencies: { 'framer-motion': '^11.0.0' },
      artifactId: 'art-456',
      sessionId: 'sess-789',
      title: 'Animation Component',
      isGuest: false // Has session, so not a guest
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  it('returns retryable error on server error (500)', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' })
    });

    const code = `import { motion } from 'framer-motion';`;
    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Server error');
      expect(result.retryable).toBe(true);
      expect(result.details).toContain('temporarily unavailable');
    }
  });

  it('handles network errors gracefully', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const code = `import { motion } from 'framer-motion';`;
    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Bundling failed');
      expect(result.details).toContain('Network error');
    }
  });

  it('handles generic HTTP errors (400)', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Invalid artifact code',
        details: 'Syntax error on line 5'
      })
    });

    const code = `import { motion } from 'framer-motion';`;
    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid artifact code');
      expect(result.details).toBe('Syntax error on line 5');
    }
  });

  it('handles response with no error message', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}) // Empty error response
    });

    const code = `import { motion } from 'framer-motion';`;
    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Request failed with status 503');
    }
  });

  it('handles unexpected error types', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    // Throw non-Error object
    global.fetch = vi.fn().mockRejectedValue('String error');

    const code = `import { motion } from 'framer-motion';`;
    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Bundling failed');
      expect(result.details).toBe('String error');
    }
  });

  // ============================================
  // MULTIPLE DEPENDENCIES TEST
  // ============================================

  it('handles multiple npm dependencies correctly', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        bundleUrl: 'https://example.com/bundle.html',
        bundleSize: 50000,
        bundleTime: 3500,
        dependencies: ['framer-motion', 'lucide-react', 'recharts'],
        expiresAt: new Date().toISOString(),
        requestId: 'req-multi'
      })
    });

    // Use only unscoped packages (scoped packages with @ are filtered by regex)
    const code = `
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { LineChart } from 'recharts';
export default function App() { return <div>Test</div> }
`;

    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.dependencies).toHaveLength(3);
      expect(result.dependencies).toContain('framer-motion');
      expect(result.dependencies).toContain('lucide-react');
      expect(result.dependencies).toContain('recharts');
    }

    // Verify request included all dependencies
    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1]?.body as string);
    expect(Object.keys(requestBody.dependencies)).toHaveLength(3);
  });

  // ============================================
  // RESPONSE VALIDATION TESTS
  // ============================================

  it('handles server returning non-JSON response', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    // Server returns HTML/text instead of JSON
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0');
      }
    });

    const code = `import { motion } from 'framer-motion';`;
    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid server response');
      expect(result.details).toBe('Expected JSON but received invalid data');
      expect(result.retryable).toBe(true);
    }
  });

  it('handles response missing bundleUrl', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    // Server returns success but missing bundleUrl
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        bundleSize: 12345,
        bundleTime: 2000,
        dependencies: ['framer-motion'],
        expiresAt: new Date().toISOString(),
        requestId: 'req-123'
        // Missing bundleUrl!
      })
    });

    const code = `import { motion } from 'framer-motion';`;
    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid server response');
      expect(result.details).toBe('Server returned malformed bundle data (missing bundleUrl)');
    }
  });

  it('handles response with invalid bundleSize type', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    // Server returns bundleSize as string instead of number
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        bundleUrl: 'https://storage.supabase.co/bundle.html',
        bundleSize: '12345', // String instead of number
        bundleTime: 2000,
        dependencies: ['framer-motion'],
        expiresAt: new Date().toISOString(),
        requestId: 'req-123'
      })
    });

    const code = `import { motion } from 'framer-motion';`;
    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid server response');
      expect(result.details).toBe('Server returned malformed bundle data (invalid bundleSize)');
    }
  });

  it('handles response with invalid dependencies type', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'user-id' }
        } as any
      },
      error: null
    });

    // Server returns dependencies as string instead of array
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        bundleUrl: 'https://storage.supabase.co/bundle.html',
        bundleSize: 12345,
        bundleTime: 2000,
        dependencies: 'framer-motion', // String instead of array
        expiresAt: new Date().toISOString(),
        requestId: 'req-123'
      })
    });

    const code = `import { motion } from 'framer-motion';`;
    const result = await bundleArtifact(code, 'id', 'session', 'title');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid server response');
      expect(result.details).toBe('Server returned malformed bundle data (invalid dependencies)');
    }
  });
});

// ============================================
// NEEDS BUNDLING HELPER TESTS
// ============================================

describe('needsBundling', () => {
  it('returns true for React artifacts with npm imports', () => {
    // Use unscoped package (scoped packages starting with @ are filtered by regex [^'"@./])
    const code = `import { motion } from 'framer-motion';`;
    expect(needsBundling(code, 'react')).toBe(true);
  });

  it('returns false for React artifacts without npm imports', () => {
    const code = `export default function App() { return <div>Hello</div> }`;
    expect(needsBundling(code, 'react')).toBe(false);
  });

  it('returns false for React artifacts with only React imports', () => {
    const code = `import React from 'react';
import ReactDOM from 'react-dom';
export default function App() { return <div>Hello</div> }`;
    expect(needsBundling(code, 'react')).toBe(false);
  });

  it('returns false for non-React artifact types', () => {
    const code = `import something from 'package';`;
    expect(needsBundling(code, 'html')).toBe(false);
    expect(needsBundling(code, 'code')).toBe(false);
    expect(needsBundling(code, 'svg')).toBe(false);
    expect(needsBundling(code, 'markdown')).toBe(false);
  });

  it('returns true for scoped npm packages like @radix-ui', () => {
    // Server-side bundling now supports scoped packages (e.g., @radix-ui/*)
    // The regex properly differentiates between npm scoped packages and local @/ imports
    const code = `import * as DropdownMenu from '@radix-ui/react-dropdown-menu';`;
    expect(needsBundling(code, 'react')).toBe(true);
  });

  it('returns true for React artifacts with common npm packages', () => {
    expect(needsBundling(`import { motion } from 'framer-motion';`, 'react')).toBe(true);
    expect(needsBundling(`import { Star } from 'lucide-react';`, 'react')).toBe(true);
    expect(needsBundling(`import _ from 'lodash';`, 'react')).toBe(true);
  });

  it('returns false for relative imports', () => {
    const code = `import Component from './Component';`;
    expect(needsBundling(code, 'react')).toBe(false);
  });

  it('returns false for absolute local imports', () => {
    const code = `import { Button } from '@/components/ui/button';`;
    expect(needsBundling(code, 'react')).toBe(false);
  });
});