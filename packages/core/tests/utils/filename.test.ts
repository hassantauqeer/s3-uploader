import { describe, it, expect } from 'vitest';
import { scrubFilename, addUniquePrefix, getContentDisposition } from '../../src/utils/filename';

describe('scrubFilename', () => {
  it('should remove special characters', () => {
    expect(scrubFilename('my@file#name$.jpg')).toBe('myfilename.jpg');
  });

  it('should replace spaces with hyphens', () => {
    expect(scrubFilename('my file name.jpg')).toBe('my-file-name.jpg');
  });

  it('should convert to lowercase', () => {
    expect(scrubFilename('MyFile.JPG')).toBe('myfile.jpg');
  });

  it('should remove leading dots', () => {
    expect(scrubFilename('...file.jpg')).toBe('file.jpg');
  });

  it('should remove trailing dots from name', () => {
    expect(scrubFilename('file....jpg')).toBe('file.jpg');
  });

  it('should collapse multiple hyphens', () => {
    expect(scrubFilename('my---file---name.jpg')).toBe('my-file-name.jpg');
  });

  it('should handle files without extensions', () => {
    expect(scrubFilename('myfile')).toBe('myfile');
  });

  it('should preserve valid characters', () => {
    expect(scrubFilename('my-file_name.2023.jpg')).toBe('my-file_name.2023.jpg');
  });

  it('should handle path traversal attempts', () => {
    expect(scrubFilename('../../../etc/passwd')).toBe('etcpasswd');
  });
});

describe('addUniquePrefix', () => {
  it('should add a prefix to filename', () => {
    const result = addUniquePrefix('test.jpg');
    expect(result).toMatch(/^[\w-]+-test\.jpg$/);
  });

  it('should generate different prefixes for multiple calls', () => {
    const result1 = addUniquePrefix('test.jpg');
    const result2 = addUniquePrefix('test.jpg');
    expect(result1).not.toBe(result2);
  });

  it('should work with files without extensions', () => {
    const result = addUniquePrefix('test');
    expect(result).toMatch(/^[\w-]+-test$/);
  });
});

describe('getContentDisposition', () => {
  it('should return inline for images in auto mode', () => {
    const result = getContentDisposition('photo.jpg', 'image/jpeg', 'auto');
    expect(result).toContain('inline');
    expect(result).toContain('photo.jpg');
  });

  it('should return attachment for non-images in auto mode', () => {
    const result = getContentDisposition('document.pdf', 'application/pdf', 'auto');
    expect(result).toContain('attachment');
    expect(result).toContain('document.pdf');
  });

  it('should respect explicit inline mode', () => {
    const result = getContentDisposition('document.pdf', 'application/pdf', 'inline');
    expect(result).toContain('inline');
  });

  it('should respect explicit attachment mode', () => {
    const result = getContentDisposition('photo.jpg', 'image/jpeg', 'attachment');
    expect(result).toContain('attachment');
  });

  it('should encode special characters in filename', () => {
    const result = getContentDisposition('my file (1).jpg', 'image/jpeg', 'inline');
    expect(result).toContain('my%20file%20%281%29.jpg');
  });

  it('should include both regular and UTF-8 filename', () => {
    const result = getContentDisposition('test.jpg', 'image/jpeg', 'inline');
    expect(result).toContain('filename="test.jpg"');
    expect(result).toContain("filename*=UTF-8''test.jpg");
  });
});
