import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, getRetryConfig } from '../../src/retry/exponential-backoff';
import { UploadError } from '../../src/types';

describe('getRetryConfig', () => {
  it('should return default config when no config provided', () => {
    const config = getRetryConfig();
    expect(config.maxRetries).toBe(3);
    expect(config.initialDelay).toBe(1000);
    expect(config.backoffMultiplier).toBe(2);
    expect(config.maxDelay).toBe(30000);
    expect(config.retryableStatuses).toEqual([408, 429, 500, 502, 503, 504]);
  });

  it('should merge provided config with defaults', () => {
    const config = getRetryConfig({ maxRetries: 5, initialDelay: 500 });
    expect(config.maxRetries).toBe(5);
    expect(config.initialDelay).toBe(500);
    expect(config.backoffMultiplier).toBe(2);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const config = getRetryConfig({ maxRetries: 3 });

    const promise = withRetry(fn, config, { taskId: 'test' });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable error', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new UploadError('Network error', 'NETWORK_ERROR', { retryable: true }))
      .mockResolvedValue('success');
    
    const config = getRetryConfig({ maxRetries: 3, initialDelay: 100 });

    const promise = withRetry(fn, config, { taskId: 'test' });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable error', async () => {
    const error = new UploadError('Validation error', 'VALIDATION_ERROR', { retryable: false });
    const fn = vi.fn().mockRejectedValue(error);
    const config = getRetryConfig({ maxRetries: 3 });

    const promise = withRetry(fn, config, { taskId: 'test' });
    
    await expect(promise).rejects.toThrow('Validation error');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not retry on AbortError', async () => {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    const fn = vi.fn().mockRejectedValue(error);
    const config = getRetryConfig({ maxRetries: 3 });

    const promise = withRetry(fn, config, { taskId: 'test' });
    
    await expect(promise).rejects.toThrow('Aborted');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable status codes', async () => {
    const error = new UploadError('Server error', 'UPLOAD_ERROR', { statusCode: 503, retryable: true });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    
    const config = getRetryConfig({ maxRetries: 3, initialDelay: 100 });

    const promise = withRetry(fn, config, { taskId: 'test' });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable status codes', async () => {
    const error = new UploadError('Bad request', 'UPLOAD_ERROR', { statusCode: 400, retryable: true });
    const fn = vi.fn().mockRejectedValue(error);
    const config = getRetryConfig({ maxRetries: 3 });

    const promise = withRetry(fn, config, { taskId: 'test' });
    
    await expect(promise).rejects.toThrow('Bad request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry TypeError (network errors)', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Network failure'))
      .mockResolvedValue('success');
    
    const config = getRetryConfig({ maxRetries: 3, initialDelay: 100 });

    const promise = withRetry(fn, config, { taskId: 'test' });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should stop after max retries', async () => {
    const error = new UploadError('Network error', 'NETWORK_ERROR', { retryable: true });
    const fn = vi.fn().mockRejectedValue(error);
    const config = getRetryConfig({ maxRetries: 2, initialDelay: 100 });

    const promise = withRetry(fn, config, { taskId: 'test' });
    await vi.runAllTimersAsync();
    
    await expect(promise).rejects.toThrow('Network error');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff', async () => {
    const error = new UploadError('Network error', 'NETWORK_ERROR', { retryable: true });
    const fn = vi.fn().mockRejectedValue(error);
    const config = getRetryConfig({ maxRetries: 3, initialDelay: 1000, backoffMultiplier: 2 });

    const promise = withRetry(fn, config, { taskId: 'test' });
    
    const timers: number[] = [];
    vi.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void, delay: number) => {
      timers.push(delay);
      return setTimeout(callback, 0);
    }) as typeof setTimeout);

    await vi.runAllTimersAsync();
    await promise.catch(() => {});

    expect(timers.length).toBeGreaterThan(0);
    expect(timers[0]).toBeGreaterThan(500);
    expect(timers[0]).toBeLessThan(1500);
  });

  it('should respect maxDelay cap', async () => {
    const error = new UploadError('Network error', 'NETWORK_ERROR', { retryable: true });
    const fn = vi.fn().mockRejectedValue(error);
    const config = getRetryConfig({ 
      maxRetries: 10, 
      initialDelay: 10000, 
      backoffMultiplier: 2,
      maxDelay: 5000 
    });

    const promise = withRetry(fn, config, { taskId: 'test' });
    
    const timers: number[] = [];
    vi.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void, delay: number) => {
      timers.push(delay);
      return setTimeout(callback, 0);
    }) as typeof setTimeout);

    await vi.runAllTimersAsync();
    await promise.catch(() => {});

    timers.forEach(delay => {
      expect(delay).toBeLessThanOrEqual(5000 * 1.25);
    });
  });

  it('should use custom shouldRetry function', async () => {
    const error = new UploadError('Custom error', 'UPLOAD_ERROR', { statusCode: 500 });
    const fn = vi.fn().mockRejectedValue(error);
    const shouldRetry = vi.fn().mockReturnValue(false);
    const config = getRetryConfig({ 
      maxRetries: 3,
      shouldRetry 
    });

    const promise = withRetry(fn, config, { taskId: 'test' });
    
    await expect(promise).rejects.toThrow('Custom error');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(error, 1);
  });
});
