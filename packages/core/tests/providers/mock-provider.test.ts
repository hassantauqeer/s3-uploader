import { describe, it, expect, beforeEach } from 'vitest';
import { createMockProvider } from '../../src/providers/mock-provider';

describe('createMockProvider', () => {
  describe('getSignedUrl', () => {
    it('should return signed URL and public URL', async () => {
      const provider = createMockProvider();
      const result = await provider.getSignedUrl({
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
        fileSize: 1000,
      });

      expect(result.signedUrl).toContain('test.jpg');
      expect(result.signedUrl).toContain('signature=mock');
      expect(result.publicUrl).toContain('test.jpg');
      expect(result.key).toBe('test.jpg');
      expect(result.headers?.['Content-Type']).toBe('image/jpeg');
    });

    it('should include path prefix in key', async () => {
      const provider = createMockProvider();
      const result = await provider.getSignedUrl({
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
        fileSize: 1000,
        path: 'uploads/',
      });

      expect(result.key).toBe('uploads/test.jpg');
      expect(result.publicUrl).toContain('uploads/test.jpg');
    });

    it('should include metadata headers', async () => {
      const provider = createMockProvider();
      const result = await provider.getSignedUrl({
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
        fileSize: 1000,
        metadata: { userId: '123', category: 'profile' },
      });

      expect(result.headers?.['x-amz-meta-userId']).toBe('123');
      expect(result.headers?.['x-amz-meta-category']).toBe('profile');
    });

    it('should use custom base URL', async () => {
      const provider = createMockProvider({ baseUrl: 'https://custom.example.com' });
      const result = await provider.getSignedUrl({
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
        fileSize: 1000,
      });

      expect(result.publicUrl).toContain('custom.example.com');
    });

    it('should simulate signing delay', async () => {
      const provider = createMockProvider({ signingDelay: 100 });
      const start = Date.now();
      await provider.getSignedUrl({
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
        fileSize: 1000,
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    it('should simulate failures based on fail rate', async () => {
      const provider = createMockProvider({ 
        failRate: 1,
        failError: { statusCode: 500, message: 'Test error' }
      });

      await expect(
        provider.getSignedUrl({
          fileName: 'test.jpg',
          contentType: 'image/jpeg',
          fileSize: 1000,
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('multipart upload flow', () => {
    it('should initiate multipart upload', async () => {
      const provider = createMockProvider();
      const result = await provider.initiateMultipart({
        fileName: 'large-file.mp4',
        contentType: 'video/mp4',
        fileSize: 100_000_000,
      });

      expect(result.uploadId).toBeTruthy();
      expect(result.key).toBe('large-file.mp4');
    });

    it('should get signed URLs for parts', async () => {
      const provider = createMockProvider();
      const initResult = await provider.initiateMultipart({
        fileName: 'large-file.mp4',
        contentType: 'video/mp4',
        fileSize: 100_000_000,
      });

      const partResult = await provider.getPartSignedUrl({
        uploadId: initResult.uploadId,
        key: initResult.key,
        partNumber: 1,
        contentLength: 10_000_000,
      });

      expect(partResult.signedUrl).toContain(initResult.uploadId);
      expect(partResult.signedUrl).toContain('partNumber=1');
      expect(partResult.key).toBe(initResult.key);
    });

    it('should fail to get part URL for non-existent session', async () => {
      const provider = createMockProvider();

      await expect(
        provider.getPartSignedUrl({
          uploadId: 'non-existent',
          key: 'test.mp4',
          partNumber: 1,
          contentLength: 1000,
        })
      ).rejects.toThrow('not found');
    });

    it('should complete multipart upload', async () => {
      const provider = createMockProvider();
      const initResult = await provider.initiateMultipart({
        fileName: 'large-file.mp4',
        contentType: 'video/mp4',
        fileSize: 100_000_000,
      });

      const completeResult = await provider.completeMultipart({
        uploadId: initResult.uploadId,
        key: initResult.key,
        parts: [
          { partNumber: 1, etag: '"etag1"' },
          { partNumber: 2, etag: '"etag2"' },
        ],
      });

      expect(completeResult.publicUrl).toContain('large-file.mp4');
      expect(completeResult.key).toBe(initResult.key);
      expect(completeResult.etag).toBeTruthy();
    });

    it('should fail to complete non-existent session', async () => {
      const provider = createMockProvider();

      await expect(
        provider.completeMultipart({
          uploadId: 'non-existent',
          key: 'test.mp4',
          parts: [],
        })
      ).rejects.toThrow('not found');
    });

    it('should abort multipart upload', async () => {
      const provider = createMockProvider();
      const initResult = await provider.initiateMultipart({
        fileName: 'large-file.mp4',
        contentType: 'video/mp4',
        fileSize: 100_000_000,
      });

      await provider.abortMultipart({
        uploadId: initResult.uploadId,
        key: initResult.key,
      });

      await expect(
        provider.getPartSignedUrl({
          uploadId: initResult.uploadId,
          key: initResult.key,
          partNumber: 1,
          contentLength: 1000,
        })
      ).rejects.toThrow('not found');
    });

    it('should simulate completion delay', async () => {
      const provider = createMockProvider({ completionDelay: 100 });
      const initResult = await provider.initiateMultipart({
        fileName: 'large-file.mp4',
        contentType: 'video/mp4',
        fileSize: 100_000_000,
      });

      const start = Date.now();
      await provider.completeMultipart({
        uploadId: initResult.uploadId,
        key: initResult.key,
        parts: [],
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('path handling', () => {
    it('should handle path with leading slash', async () => {
      const provider = createMockProvider();
      const result = await provider.getSignedUrl({
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
        fileSize: 1000,
        path: '/uploads/',
      });

      expect(result.key).toBe('uploads/test.jpg');
    });

    it('should handle path with trailing slash', async () => {
      const provider = createMockProvider();
      const result = await provider.getSignedUrl({
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
        fileSize: 1000,
        path: 'uploads/',
      });

      expect(result.key).toBe('uploads/test.jpg');
    });

    it('should handle path without slashes', async () => {
      const provider = createMockProvider();
      const result = await provider.getSignedUrl({
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
        fileSize: 1000,
        path: 'uploads',
      });

      expect(result.key).toBe('uploads/test.jpg');
    });
  });
});
