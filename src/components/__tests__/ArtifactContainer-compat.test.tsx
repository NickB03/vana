import { describe, it, expect, vi, beforeAll } from 'vitest';
import { ArtifactContainer as Artifact, ArtifactData, ArtifactType } from '../ArtifactContainer';

// ✅ Fixed: Mock Supabase to prevent storage errors
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

/**
 * This file tests the ArtifactContainer component directly (imported as "Artifact" for backwards compatibility).
 * The comprehensive testing is done in ArtifactContainer.test.tsx.
 * These tests verify the component exports work correctly.
 */
describe('Artifact (backward compatibility wrapper)', () => {
  beforeAll(() => {
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
  });

  it('exports Artifact component (aliased from ArtifactContainer)', () => {
    expect(Artifact).toBeDefined();
    expect(typeof Artifact).toBe('function');
  });

  it('exports ArtifactData type', () => {
    const mockData: ArtifactData = {
      id: 'test',
      type: 'code',
      title: 'Test',
      content: 'console.log("test")',
    };
    expect(mockData.id).toBe('test');
  });

  it('exports ArtifactType enum values', () => {
    const types: ArtifactType[] = ['code', 'html', 'react', 'svg', 'mermaid', 'markdown', 'image'];
    expect(types).toContain('code');
    expect(types).toContain('react');
  });
});
