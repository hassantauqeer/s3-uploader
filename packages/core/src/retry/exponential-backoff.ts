import type { RetryConfig, UploadError } from '../types';

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  shouldRetry: () => true,
};

export function getRetryConfig(config?: RetryConfig): Required<RetryConfig> {
  return {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Required<RetryConfig>,
  context: { taskId: string; partNumber?: number }
): Promise<T> {
  let lastError: UploadError | Error | undefined;
  let attempt = 0;

  while (attempt <= config.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as UploadError | Error;
      attempt++;

      if (attempt > config.maxRetries) {
        throw lastError;
      }

      const shouldRetry = isRetryable(lastError, attempt, config);
      if (!shouldRetry) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, config);
      await sleep(delay);
    }
  }

  throw lastError;
}

function isRetryable(
  error: UploadError | Error,
  attempt: number,
  config: Required<RetryConfig>
): boolean {
  if (error instanceof Error && error.name === 'AbortError') {
    return false;
  }

  if ('retryable' in error && error.retryable === false) {
    return false;
  }

  if ('statusCode' in error && error.statusCode) {
    if (!config.retryableStatuses.includes(error.statusCode)) {
      return false;
    }
  }

  if (error instanceof TypeError) {
    return true;
  }

  if ('code' in error && typeof error.code === 'string') {
    const uploadError = error as UploadError;
    return config.shouldRetry(uploadError, attempt);
  }

  return true;
}

function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const baseDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(baseDelay, config.maxDelay);
  
  const jitter = cappedDelay * 0.25;
  const randomJitter = (Math.random() - 0.5) * 2 * jitter;
  
  return Math.max(0, cappedDelay + randomJitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
