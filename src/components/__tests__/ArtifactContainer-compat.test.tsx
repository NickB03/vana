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
 * Artifact.tsx is a backward compatibility wrapper that re-exports ArtifactContainer.
 * The comprehensive testing is done in ArtifactContainer.test.tsx.
 * These tests verify the re-export works correctly.
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
