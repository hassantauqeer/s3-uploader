import { describe, it, expect, beforeEach } from 'vitest';
import { validateFile } from '../../src/validators/file-validator';
import type { ValidationConfig } from '../../src/types';

function createMockFile(options: {
  name: string;
  size: number;
  type: string;
}): File {
  const blob = new Blob(['x'.repeat(options.size)], { type: options.type });
  return new File([blob], options.name, { type: options.type });
}

describe('validateFile', () => {
  describe('file type validation', () => {
    it('should allow files with allowed types', async () => {
      const file = createMockFile({ name: 'test.jpg', size: 1000, type: 'image/jpeg' });
      const config: ValidationConfig = {
        allowedTypes: ['image/jpeg', 'image/png'],
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files with disallowed types', async () => {
      const file = createMockFile({ name: 'test.pdf', size: 1000, type: 'application/pdf' });
      const config: ValidationConfig = {
        allowedTypes: ['image/jpeg', 'image/png'],
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File type "application/pdf" is not allowed. Allowed types: image/jpeg, image/png');
    });

    it('should support wildcard type matching', async () => {
      const file = createMockFile({ name: 'test.jpg', size: 1000, type: 'image/jpeg' });
      const config: ValidationConfig = {
        allowedTypes: ['image/*'],
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(true);
    });

    it('should reject blocked types', async () => {
      const file = createMockFile({ name: 'test.exe', size: 1000, type: 'application/x-msdownload' });
      const config: ValidationConfig = {
        blockedTypes: ['application/x-msdownload'],
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('not allowed');
    });

    it('should prioritize blocked types over allowed types', async () => {
      const file = createMockFile({ name: 'test.jpg', size: 1000, type: 'image/jpeg' });
      const config: ValidationConfig = {
        allowedTypes: ['image/*'],
        blockedTypes: ['image/jpeg'],
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(false);
    });
  });

  describe('file extension validation', () => {
    it('should allow files with allowed extensions', async () => {
      const file = createMockFile({ name: 'test.jpg', size: 1000, type: 'image/jpeg' });
      const config: ValidationConfig = {
        allowedExtensions: ['.jpg', '.png'],
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(true);
    });

    it('should reject files with disallowed extensions', async () => {
      const file = createMockFile({ name: 'test.pdf', size: 1000, type: 'application/pdf' });
      const config: ValidationConfig = {
        allowedExtensions: ['.jpg', '.png'],
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('extension');
    });

    it('should be case-insensitive for extensions', async () => {
      const file = createMockFile({ name: 'test.JPG', size: 1000, type: 'image/jpeg' });
      const config: ValidationConfig = {
        allowedExtensions: ['.jpg'],
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(true);
    });
  });

  describe('file size validation', () => {
    it('should allow files within size limits', async () => {
      const file = createMockFile({ name: 'test.jpg', size: 5000, type: 'image/jpeg' });
      const config: ValidationConfig = {
        minFileSize: 1000,
        maxFileSize: 10000,
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(true);
    });

    it('should reject files below minimum size', async () => {
      const file = createMockFile({ name: 'test.jpg', size: 500, type: 'image/jpeg' });
      const config: ValidationConfig = {
        minFileSize: 1000,
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('below minimum');
    });

    it('should reject files above maximum size', async () => {
      const file = createMockFile({ name: 'test.jpg', size: 15000, type: 'image/jpeg' });
      const config: ValidationConfig = {
        maxFileSize: 10000,
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum');
    });

    it('should use default minimum size of 1 byte', async () => {
      const file = createMockFile({ name: 'test.jpg', size: 0, type: 'image/jpeg' });
      const config: ValidationConfig = {};

      const result = await validateFile(file, config);
      expect(result.valid).toBe(false);
    });

    it('should allow null maxFileSize for no limit', async () => {
      const file = createMockFile({ name: 'test.jpg', size: 1000000000, type: 'image/jpeg' });
      const config: ValidationConfig = {
        maxFileSize: null,
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(true);
    });
  });

  describe('custom validation', () => {
    it('should run custom validation function', async () => {
      const file = createMockFile({ name: 'test.jpg', size: 1000, type: 'image/jpeg' });
      const config: ValidationConfig = {
        custom: (file) => {
          if (file.name.includes('invalid')) {
            return 'Filename contains invalid word';
          }
          return null;
        },
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(true);
    });

    it('should fail when custom validation returns error', async () => {
      const file = createMockFile({ name: 'invalid.jpg', size: 1000, type: 'image/jpeg' });
      const config: ValidationConfig = {
        custom: (file) => {
          if (file.name.includes('invalid')) {
            return 'Filename contains invalid word';
          }
          return null;
        },
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Filename contains invalid word');
    });

    it('should support async custom validation', async () => {
      const file = createMockFile({ name: 'test.jpg', size: 1000, type: 'image/jpeg' });
      const config: ValidationConfig = {
        custom: async (file) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return file.size > 2000 ? 'File too large' : null;
        },
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(true);
    });

    it('should handle custom validation errors gracefully', async () => {
      const file = createMockFile({ name: 'test.jpg', size: 1000, type: 'image/jpeg' });
      const config: ValidationConfig = {
        custom: () => {
          throw new Error('Validation crashed');
        },
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Custom validation failed');
    });
  });

  describe('multiple validation errors', () => {
    it('should collect all validation errors', async () => {
      const file = createMockFile({ name: 'test.pdf', size: 500, type: 'application/pdf' });
      const config: ValidationConfig = {
        allowedTypes: ['image/*'],
        minFileSize: 1000,
        maxFileSize: 10000,
      };

      const result = await validateFile(file, config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('no validation config', () => {
    it('should pass validation with empty config', async () => {
      const file = createMockFile({ name: 'test.jpg', size: 1000, type: 'image/jpeg' });
      const config: ValidationConfig = {};

      const result = await validateFile(file, config);
      expect(result.valid).toBe(true);
    });
  });
});
