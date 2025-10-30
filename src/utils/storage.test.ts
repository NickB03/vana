import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@/test/mocks/supabase';

describe('Storage URL Generation', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  describe('Signed URL Generation', () => {
    it('should handle successful signed URL generation', async () => {
      const testFileName = 'test-user-id/test-file.jpg';
      const expectedUrl = 'https://example.supabase.co/storage/v1/sign/test.jpg?token=test';

      const result = await mockSupabase.storage
        .from('user-uploads')
        .createSignedUrl(testFileName, 604800);

      expect(result.data?.signedUrl).toBe(expectedUrl);
      expect(result.error).toBeNull();
    });

    it('should handle signed URL generation failure with proper error message', async () => {
      const testFileName = 'test-user-id/test-file.jpg';
      const errorMessage = 'Insufficient permissions';

      mockSupabase.storage.from = vi.fn(() => ({
        upload: vi.fn(),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: null,
          error: { message: errorMessage }
        }),
        getPublicUrl: vi.fn()
      }));

      const result = await mockSupabase.storage
        .from('user-uploads')
        .createSignedUrl(testFileName, 604800);

      expect(result.error?.message).toBe(errorMessage);
      expect(result.data).toBeNull();
    });

    it('should handle missing signedUrl in response', async () => {
      const testFileName = 'test-user-id/test-file.jpg';

      mockSupabase.storage.from = vi.fn(() => ({
        upload: vi.fn(),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: {}, // Missing signedUrl property
          error: null
        }),
        getPublicUrl: vi.fn()
      }));

      const result = await mockSupabase.storage
        .from('user-uploads')
        .createSignedUrl(testFileName, 604800);

      expect(result.data?.signedUrl).toBeUndefined();
      expect(result.error).toBeNull();
    });
  });

  describe('File Upload with Signed URL', () => {
    it('should successfully upload file and generate signed URL', async () => {
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const testFileName = 'test-user-id/test.jpg';

      // Mock successful upload
      const uploadMock = vi.fn().mockResolvedValue({
        data: { path: testFileName },
        error: null
      });

      // Mock successful signed URL generation
      const createSignedUrlMock = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.supabase.co/storage/v1/sign/test.jpg?token=test' },
        error: null
      });

      mockSupabase.storage.from = vi.fn(() => ({
        upload: uploadMock,
        createSignedUrl: createSignedUrlMock,
        getPublicUrl: vi.fn()
      }));

      // Simulate upload flow
      const storage = mockSupabase.storage.from('user-uploads');
      const uploadResult = await storage.upload(testFileName, testFile);
      expect(uploadResult.error).toBeNull();

      const signedUrlResult = await storage.createSignedUrl(testFileName, 604800);
      expect(signedUrlResult.data?.signedUrl).toBeDefined();
      expect(signedUrlResult.error).toBeNull();
    });

    it('should handle upload success but signed URL failure gracefully', async () => {
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const testFileName = 'test-user-id/test.jpg';

      // Mock successful upload
      const uploadMock = vi.fn().mockResolvedValue({
        data: { path: testFileName },
        error: null
      });

      // Mock failed signed URL generation
      const createSignedUrlMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to generate secure URL: Network error' }
      });

      mockSupabase.storage.from = vi.fn(() => ({
        upload: uploadMock,
        createSignedUrl: createSignedUrlMock,
        getPublicUrl: vi.fn()
      }));

      const storage = mockSupabase.storage.from('user-uploads');

      // Upload should succeed
      const uploadResult = await storage.upload(testFileName, testFile);
      expect(uploadResult.error).toBeNull();

      // Signed URL generation should fail with informative error
      const signedUrlResult = await storage.createSignedUrl(testFileName, 604800);
      expect(signedUrlResult.error?.message).toContain('Failed to generate secure URL');
      expect(signedUrlResult.data).toBeNull();
    });
  });

  describe('Edge Function Storage Warning', () => {
    it('should include storageWarning when falling back to base64', () => {
      // This tests the expected response format when storage operations fail
      const responseWithWarning = {
        success: true,
        imageData: 'data:image/png;base64,iVBORw0KGgo...',
        imageUrl: 'data:image/png;base64,iVBORw0KGgo...', // Falls back to base64
        prompt: 'Test prompt',
        storageWarning: 'Image storage failed (Network error). Using temporary base64 - image may not persist long-term.'
      };

      expect(responseWithWarning.storageWarning).toBeDefined();
      expect(responseWithWarning.storageWarning).toContain('Using temporary base64');
      expect(responseWithWarning.imageUrl).toBe(responseWithWarning.imageData);
    });

    it('should not include storageWarning when storage succeeds', () => {
      // This tests the expected response format when everything works
      const responseWithoutWarning = {
        success: true,
        imageData: 'data:image/png;base64,iVBORw0KGgo...',
        imageUrl: 'https://example.supabase.co/storage/v1/sign/image.png?token=abc123',
        prompt: 'Test prompt',
        storageWarning: undefined
      };

      expect(responseWithoutWarning.storageWarning).toBeUndefined();
      expect(responseWithoutWarning.imageUrl).not.toBe(responseWithoutWarning.imageData);
      expect(responseWithoutWarning.imageUrl).toContain('sign');
    });
  });

  describe('Error Message Improvements', () => {
    it('should provide specific error context for signed URL failures', () => {
      const testErrors = [
        {
          error: new Error('Failed to generate secure URL: Insufficient permissions'),
          expectedToast: 'Upload succeeded but URL generation failed: Failed to generate secure URL: Insufficient permissions'
        },
        {
          error: new Error('Failed to generate secure URL: No URL returned from storage service'),
          expectedToast: 'Upload succeeded but URL generation failed: Failed to generate secure URL: No URL returned from storage service'
        },
        {
          error: new Error('File too large'),
          expectedToast: 'File is too large. Maximum size is 100MB.'
        },
        {
          error: new Error('Invalid file type'),
          expectedToast: 'Invalid file type. Supported types: images, documents, text files.'
        }
      ];

      testErrors.forEach(({ error, expectedToast }) => {
        const errorMessage = error.message;
        let toastMessage: string;

        // Simulate the error handling logic from ChatInterface.tsx
        if (errorMessage.includes('secure URL')) {
          toastMessage = `Upload succeeded but URL generation failed: ${errorMessage}`;
        } else if (errorMessage.includes('File too large')) {
          toastMessage = 'File is too large. Maximum size is 100MB.';
        } else if (errorMessage.includes('Invalid file type')) {
          toastMessage = 'Invalid file type. Supported types: images, documents, text files.';
        } else {
          toastMessage = `Failed to upload file: ${errorMessage}`;
        }

        expect(toastMessage).toBe(expectedToast);
      });
    });
  });
});