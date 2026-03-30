import { describe, it, expect } from 'vitest';
import { getContentType } from '../../src/utils/content-type';

describe('getContentType', () => {
  it('should detect image MIME types', () => {
    expect(getContentType('photo.jpg')).toBe('image/jpeg');
    expect(getContentType('photo.jpeg')).toBe('image/jpeg');
    expect(getContentType('image.png')).toBe('image/png');
    expect(getContentType('animation.gif')).toBe('image/gif');
    expect(getContentType('image.webp')).toBe('image/webp');
  });

  it('should detect document MIME types', () => {
    expect(getContentType('document.pdf')).toBe('application/pdf');
    expect(getContentType('doc.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(getContentType('sheet.xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });

  it('should detect text MIME types', () => {
    expect(getContentType('file.txt')).toBe('text/plain');
    expect(getContentType('data.csv')).toBe('text/csv');
    expect(getContentType('config.json')).toBe('application/json');
  });

  it('should detect video MIME types', () => {
    expect(getContentType('video.mp4')).toBe('video/mp4');
    expect(getContentType('video.webm')).toBe('video/webm');
    expect(getContentType('video.mov')).toBe('video/quicktime');
  });

  it('should detect audio MIME types', () => {
    expect(getContentType('audio.mp3')).toBe('audio/mpeg');
    expect(getContentType('audio.wav')).toBe('audio/wav');
  });

  it('should be case-insensitive', () => {
    expect(getContentType('photo.JPG')).toBe('image/jpeg');
    expect(getContentType('photo.PNG')).toBe('image/png');
  });

  it('should return default for unknown extensions', () => {
    expect(getContentType('file.xyz')).toBe('application/octet-stream');
    expect(getContentType('file')).toBe('application/octet-stream');
  });

  it('should handle files with multiple dots', () => {
    expect(getContentType('my.file.name.jpg')).toBe('image/jpeg');
  });
});
