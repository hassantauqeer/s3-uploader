import { describe, it, expect } from 'vitest';
import { generateUniqueId } from '../../src/utils/unique-id';

describe('generateUniqueId', () => {
  it('should generate a unique ID', () => {
    const id = generateUniqueId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('should generate different IDs on multiple calls', () => {
    const id1 = generateUniqueId();
    const id2 = generateUniqueId();
    expect(id1).not.toBe(id2);
  });

  it('should generate IDs with reasonable length', () => {
    const id = generateUniqueId();
    expect(id.length).toBeGreaterThan(10);
  });
});
