export function createAbortController(): AbortController {
  return new AbortController();
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
