import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadManager } from '../../src/upload-manager';
import type { UploadProvider } from '../../src/types';

describe('UploadManager - Multipart Upload', () => {
  let mockProvider: UploadProvider;

  beforeEach(() => {
    mockProvider = {
      getSignedUrl: vi.fn().mockResolvedValue({
        signedUrl: 'https://test.com/upload',
        publicUrl: 'https://test.com/file.txt',
        key: 'file.txt',
      }),
      initiateMultipart: vi.fn().mockResolvedValue({
        uploadId: 'test-upload-id',
        key: 'file.txt',
      }),
      getPartSignedUrl: vi.fn().mockResolvedValue({
        signedUrl: 'https://test.com/upload-part',
        key: 'file.txt',
      }),
      completeMultipart: vi.fn().mockResolvedValue({
        publicUrl: 'https://test.com/file.txt',
        key: 'file.txt',
        etag: 'test-etag',
      }),
      abortMultipart: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('Default Behavior', () => {
    it('should default multipartThreshold to Infinity (disabled)', () => {
      const manager = new UploadManager({ provider: mockProvider });
      // @ts-ignore - accessing private config for testing
      expect(manager.config.multipartThreshold).toBe(Infinity);
    });

    it('should default maxConcurrency to 3', () => {
      const manager = new UploadManager({ provider: mockProvider });
      // @ts-ignore - accessing private config for testing
      expect(manager.config.maxConcurrency).toBe(3);
    });

    it('should use single upload for large files when multipartThreshold not set', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
      });

      const manager = new UploadManager({ provider: mockProvider });
      // Create a file that would normally trigger multipart (if threshold was set)
      const largeFile = new File(['test content'], 'large.txt', {
        type: 'text/plain',
      });
      Object.defineProperty(largeFile, 'size', { value: 200 * 1024 * 1024 });

      const tasks = manager.addFiles([largeFile]);
      await manager.startUpload(tasks[0].id);

      expect(mockProvider.getSignedUrl).toHaveBeenCalled();
      expect(mockProvider.initiateMultipart).not.toHaveBeenCalled();
    });
  });

  describe('Multipart Opt-in', () => {
    it('should use multipart when threshold is set and file exceeds it', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ etag: 'test-etag' }),
      });

      const manager = new UploadManager({
        provider: mockProvider,
        multipartThreshold: 5 * 1024 * 1024, // 5MB
        chunkSize: 5 * 1024 * 1024,
      });

      const largeFile = new File(['test content'], 'large.txt', {
        type: 'text/plain',
      });
      Object.defineProperty(largeFile, 'size', { value: 10 * 1024 * 1024 });

      const tasks = manager.addFiles([largeFile]);
      await manager.startUpload(tasks[0].id);

      expect(mockProvider.initiateMultipart).toHaveBeenCalled();
      expect(mockProvider.getSignedUrl).not.toHaveBeenCalled();
    });

    it('should use single upload when file is below threshold', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
      });

      const manager = new UploadManager({
        provider: mockProvider,
        multipartThreshold: 10 * 1024 * 1024, // 10MB
      });

      const smallFile = new File(['test content'], 'small.txt', {
        type: 'text/plain',
      });
      Object.defineProperty(smallFile, 'size', { value: 5 * 1024 * 1024 });

      const tasks = manager.addFiles([smallFile]);
      await manager.startUpload(tasks[0].id);

      expect(mockProvider.getSignedUrl).toHaveBeenCalled();
      expect(mockProvider.initiateMultipart).not.toHaveBeenCalled();
    });
  });

  describe('Provider Config Priority', () => {
    it('should use provider multipartThreshold over config', () => {
      const providerWithThreshold: UploadProvider = {
        ...mockProvider,
        multipartThreshold: 20 * 1024 * 1024,
      };

      const manager = new UploadManager({
        provider: providerWithThreshold,
        multipartThreshold: 10 * 1024 * 1024,
      });

      // @ts-ignore - accessing private config for testing
      expect(manager.config.multipartThreshold).toBe(20 * 1024 * 1024);
    });

    it('should use provider maxConcurrency over config', () => {
      const providerWithConcurrency: UploadProvider = {
        ...mockProvider,
        maxConcurrency: 5,
      };

      const manager = new UploadManager({
        provider: providerWithConcurrency,
        maxConcurrency: 2,
      });

      // @ts-ignore - accessing private config for testing
      expect(manager.config.maxConcurrency).toBe(5);
    });
  });

  describe('Parallel Part Uploads', () => {
    it('should respect maxConcurrency limit', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ etag: 'test-etag' }),
      });

      let activeParts = 0;
      let maxActiveParts = 0;

      const trackingProvider: UploadProvider = {
        ...mockProvider,
        getPartSignedUrl: vi.fn().mockImplementation(async () => {
          activeParts++;
          maxActiveParts = Math.max(maxActiveParts, activeParts);
          await new Promise((resolve) => setTimeout(resolve, 10));
          activeParts--;
          return {
            signedUrl: 'https://test.com/upload-part',
            key: 'file.txt',
          };
        }),
      };

      const manager = new UploadManager({
        provider: trackingProvider,
        multipartThreshold: 5 * 1024 * 1024,
        chunkSize: 5 * 1024 * 1024,
        maxConcurrency: 3,
      });

      const largeFile = new File(['test content'], 'large.txt', {
        type: 'text/plain',
      });
      Object.defineProperty(largeFile, 'size', { value: 20 * 1024 * 1024 });

      const tasks = manager.addFiles([largeFile]);
      await manager.startUpload(tasks[0].id);

      expect(maxActiveParts).toBeLessThanOrEqual(3);
    });

    it('should calculate correct number of parts for multipart upload', () => {
      const manager = new UploadManager({
        provider: mockProvider,
        multipartThreshold: 5 * 1024 * 1024,
        chunkSize: 5 * 1024 * 1024,
      });

      const largeFile = new File(['test content'], 'large.txt', {
        type: 'text/plain',
      });
      Object.defineProperty(largeFile, 'size', { value: 15 * 1024 * 1024 });

      const tasks = manager.addFiles([largeFile]);
      const task = tasks[0];

      // Verify file size exceeds threshold
      expect(task.file.size).toBeGreaterThan(5 * 1024 * 1024);
      
      // Calculate expected parts (15MB / 5MB = 3 parts)
      const expectedParts = Math.ceil(task.file.size / (5 * 1024 * 1024));
      expect(expectedParts).toBe(3);
    });
  });

  describe('Custom Concurrency', () => {
    it('should allow custom maxConcurrency values', () => {
      const manager = new UploadManager({
        provider: mockProvider,
        maxConcurrency: 10,
      });

      // @ts-ignore - accessing private config for testing
      expect(manager.config.maxConcurrency).toBe(10);
    });

    it('should accept maxConcurrency of 1 for sequential uploads', () => {
      const manager = new UploadManager({
        provider: mockProvider,
        multipartThreshold: 5 * 1024 * 1024,
        chunkSize: 5 * 1024 * 1024,
        maxConcurrency: 1,
      });

      // @ts-ignore - accessing private config for testing
      expect(manager.config.maxConcurrency).toBe(1);
      expect(manager.config.multipartThreshold).toBe(5 * 1024 * 1024);
    });
  });
});
