import { vi } from 'vitest';

export const createMockSupabaseClient = () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    }),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn()
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.supabase.co/storage/v1/sign/test.jpg?token=test' },
        error: null
      }),
      getPublicUrl: vi.fn(() => ({
        data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/test.jpg' }
      }))
    }))
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        order: vi.fn(() => ({
          data: [],
          error: null
        }))
      }))
    })),
    insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    update: vi.fn().mockResolvedValue({ data: {}, error: null }),
    delete: vi.fn().mockResolvedValue({ data: {}, error: null })
  }))
});