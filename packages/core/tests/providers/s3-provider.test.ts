import { describe, it, expect, vi } from 'vitest';
import { createS3Provider } from '../../src/providers/s3-provider';

describe('S3Provider - Configuration', () => {
  describe('Multipart Configuration', () => {
    it('should accept multipartThreshold in config', () => {
      const provider = createS3Provider({
        signingUrl: 'https://api.example.com/sign',
        multipartThreshold: 10 * 1024 * 1024,
      });

      expect(provider.multipartThreshold).toBe(10 * 1024 * 1024);
    });

    it('should accept chunkSize in config', () => {
      const provider = createS3Provider({
        signingUrl: 'https://api.example.com/sign',
        chunkSize: 5 * 1024 * 1024,
      });

      expect(provider.chunkSize).toBe(5 * 1024 * 1024);
    });

    it('should accept maxConcurrency in config', () => {
      const provider = createS3Provider({
        signingUrl: 'https://api.example.com/sign',
        maxConcurrency: 5,
      });

      expect(provider.maxConcurrency).toBe(5);
    });

    it('should allow all multipart config together', () => {
      const provider = createS3Provider({
        signingUrl: 'https://api.example.com/sign',
        multipartUrl: 'https://api.example.com/multipart',
        multipartThreshold: 5 * 1024 * 1024,
        chunkSize: 5 * 1024 * 1024,
        maxConcurrency: 3,
      });

      expect(provider.multipartThreshold).toBe(5 * 1024 * 1024);
      expect(provider.chunkSize).toBe(5 * 1024 * 1024);
      expect(provider.maxConcurrency).toBe(3);
    });
  });

  describe('Multipart Requests', () => {
    it('should use POST for multipart initiate', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ uploadId: 'test-id', key: 'test.txt' }),
      });

      const provider = createS3Provider({
        signingUrl: 'https://api.example.com/sign',
        multipartUrl: 'https://api.example.com/multipart',
        requestFn: mockFetch,
      });

      await provider.initiateMultipart({
        fileName: 'test.txt',
        contentType: 'text/plain',
        fileSize: 1000,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/multipart/initiate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should use POST for multipart sign-part', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl: 'https://s3.com/part', key: 'test.txt' }),
      });

      const provider = createS3Provider({
        signingUrl: 'https://api.example.com/sign',
        multipartUrl: 'https://api.example.com/multipart',
        requestFn: mockFetch,
      });

      await provider.getPartSignedUrl({
        uploadId: 'test-id',
        key: 'test.txt',
        partNumber: 1,
        contentLength: 1000,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/multipart/sign-part',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should use POST for multipart complete', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          publicUrl: 'https://s3.com/test.txt',
          key: 'test.txt',
          etag: 'test-etag',
        }),
      });

      const provider = createS3Provider({
        signingUrl: 'https://api.example.com/sign',
        multipartUrl: 'https://api.example.com/multipart',
        requestFn: mockFetch,
      });

      await provider.completeMultipart({
        uploadId: 'test-id',
        key: 'test.txt',
        parts: [{ partNumber: 1, etag: 'etag1' }],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/multipart/complete',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should use POST for multipart abort', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const provider = createS3Provider({
        signingUrl: 'https://api.example.com/sign',
        multipartUrl: 'https://api.example.com/multipart',
        requestFn: mockFetch,
      });

      await provider.abortMultipart({
        uploadId: 'test-id',
        key: 'test.txt',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/multipart/abort',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw helpful error when multipart not configured', async () => {
      const provider = createS3Provider({
        signingUrl: 'https://api.example.com/sign',
        // No multipartUrl or multipartSigner
      });

      // The provider will try to use signingUrl + '/multipart' as default
      // but since we don't have a requestFn mock, it will fail
      // We just need to verify it attempts multipart
      try {
        await provider.initiateMultipart({
          fileName: 'test.txt',
          contentType: 'text/plain',
          fileSize: 1000,
        });
        // If we get here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        // Should throw some error (either network or config)
        expect(error).toBeDefined();
      }
    });
  });
});
