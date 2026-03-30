# S3 Uploader — Complete Project Plan

## Project Overview

Build a modern, framework-agnostic S3 file upload library to replace the abandoned `react-s3-uploader` npm package (23K weekly downloads, unmaintained for 5+ years). The library is structured as a monorepo with a zero-dependency core engine and thin framework wrappers.

### Package Names

- `@awesome-s3-uploader/core` — Framework-agnostic upload engine (zero dependencies)
- `@awesome-s3-uploader/react` — React hooks and components (peerDep: react >=18)
- Documentation site — Docusaurus deployed to GitHub Pages

### Guiding Principles

- TypeScript-first: every package ships `.d.ts` and has strict type checking
- Zero runtime dependencies in `@awesome-s3-uploader/core` (only devDependencies for testing/building)
- Headless-first: core logic is fully decoupled from UI
- Provider pattern: pluggable backends (S3, mock, MinIO, future: GCS, R2, Azure)
- Docs-as-code: documentation lives in the monorepo and deploys automatically

---

## Phase 1: Project Scaffolding & Monorepo Setup

### 1.1 Repository Initialization

```
@awesome-s3-uploader/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # Lint + test + build on PR
│   │   ├── release.yml             # Publish to npm on tag
│   │   └── docs.yml                # Deploy docs to GitHub Pages
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   └── feature_request.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CONTRIBUTING.md
├── packages/
│   ├── core/                       # @awesome-s3-uploader/core
│   │   ├── src/
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   └── react/                      # @awesome-s3-uploader/react
│       ├── src/
│       ├── tests/
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
├── docs/                           # Docusaurus site
│   ├── docs/
│   ├── src/
│   ├── static/
│   ├── docusaurus.config.ts
│   └── package.json
├── examples/
│   ├── react-basic/                # Minimal React example
│   ├── react-dropzone/             # Drag-and-drop example
│   ├── nextjs/                     # Next.js App Router example
│   ├── vanilla-js/                 # No framework example
│   └── server/
│       ├── node-express/           # Express + AWS SDK v3
│       ├── serverless-aws/         # Lambda + API Gateway
│       └── python-flask/           # Flask signing server
├── docker-compose.yml              # MinIO for integration tests
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml
├── tsconfig.base.json              # Shared TS config
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── LICENSE                         # MIT
├── README.md
└── CHANGELOG.md
```

### 1.2 Root Configuration Files

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'packages/*'
  - 'docs'
  - 'examples/*'
```

**package.json (root):**
```json
{
  "name": "@awesome-s3-uploader-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm -r --filter './packages/*' run build",
    "test": "pnpm -r --filter './packages/*' run test",
    "test:integration": "pnpm -r --filter './packages/*' run test:integration",
    "lint": "eslint packages/*/src --ext .ts,.tsx",
    "typecheck": "pnpm -r --filter './packages/*' run typecheck",
    "docs:dev": "pnpm --filter docs run start",
    "docs:build": "pnpm --filter docs run build",
    "changeset": "changeset",
    "release": "pnpm build && changeset publish",
    "clean": "pnpm -r run clean"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "tsup": "^8.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

**tsconfig.base.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

### 1.3 Build Tooling

Use `tsup` for all packages. Each package gets a `tsup.config.ts`:

```ts
// packages/core/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false,
  outDir: 'dist',
});
```

### 1.4 Versioning & Publishing

Use `@changesets/cli` for versioning and changelogs:
- Each PR that changes published code includes a changeset file
- The release workflow consumes changesets, bumps versions, updates CHANGELOG.md, and publishes to npm
- All packages follow independent versioning (not locked)

---

## Phase 2: @awesome-s3-uploader/core — The Upload Engine

This is the heart of the library. Zero dependencies, pure TypeScript.

### 2.1 Source File Structure

```
packages/core/src/
├── index.ts                    # Public API barrel export
├── types.ts                    # All public TypeScript types/interfaces
├── uploader.ts                 # createUploader() factory
├── upload-manager.ts           # Orchestrates single + multipart uploads
├── upload-task.ts              # Individual upload task with state machine
├── multipart/
│   ├── multipart-manager.ts    # Chunking, part tracking, assembly
│   ├── chunk-worker.ts         # Individual chunk upload logic
│   └── checksum.ts             # MD5/SHA256 for chunk integrity
├── providers/
│   ├── provider.ts             # Provider interface definition
│   ├── s3-provider.ts          # Real S3 pre-signed URL provider
│   └── mock-provider.ts        # In-memory mock for testing/demos
├── validators/
│   ├── file-validator.ts       # Size, type, extension, dimensions
│   └── image-validator.ts      # Image-specific: dimensions, aspect ratio
├── retry/
│   ├── retry-strategy.ts       # Retry interface
│   └── exponential-backoff.ts  # Default retry implementation
├── utils/
│   ├── event-emitter.ts        # Tiny typed event emitter
│   ├── abort-controller.ts     # AbortController wrapper
│   ├── content-type.ts         # MIME type detection from extension
│   ├── filename.ts             # Filename scrubbing/sanitization
│   └── unique-id.ts            # Simple unique ID generator
└── errors.ts                   # Custom error classes
```

### 2.2 Public Types (types.ts)

```ts
// ─── PROVIDER INTERFACE ───
// Every backend (S3, mock, GCS, R2) implements this interface.
// The core engine calls these methods — it never talks to S3 directly.

export interface UploadProvider {
  /** Get a pre-signed URL for single-part PUT upload */
  getSignedUrl(params: SignedUrlParams): Promise<SignedUrlResult>;

  /** Initiate a multipart upload session */
  initiateMultipart(params: InitiateMultipartParams): Promise<MultipartInitResult>;

  /** Get a pre-signed URL for uploading one part/chunk */
  getPartSignedUrl(params: PartSignedUrlParams): Promise<SignedUrlResult>;

  /** Complete the multipart upload by assembling all parts */
  completeMultipart(params: CompleteMultipartParams): Promise<CompleteMultipartResult>;

  /** Abort a multipart upload (cleanup) */
  abortMultipart(params: AbortMultipartParams): Promise<void>;
}

export interface SignedUrlParams {
  fileName: string;
  contentType: string;
  fileSize: number;
  metadata?: Record<string, string>;
  /** Path prefix inside the bucket, e.g. "uploads/" */
  path?: string;
}

export interface SignedUrlResult {
  signedUrl: string;
  /** The final public URL where the file will be accessible */
  publicUrl: string;
  /** The object key in S3 */
  key: string;
  /** Any headers that must be sent with the PUT request */
  headers?: Record<string, string>;
}

export interface InitiateMultipartParams {
  fileName: string;
  contentType: string;
  fileSize: number;
  metadata?: Record<string, string>;
  path?: string;
}

export interface MultipartInitResult {
  uploadId: string;
  key: string;
}

export interface PartSignedUrlParams {
  uploadId: string;
  key: string;
  partNumber: number;
  contentLength: number;
}

export interface CompleteMultipartParams {
  uploadId: string;
  key: string;
  parts: CompletedPart[];
}

export interface CompletedPart {
  partNumber: number;
  etag: string;
}

export interface CompleteMultipartResult {
  publicUrl: string;
  key: string;
  etag: string;
}

export interface AbortMultipartParams {
  uploadId: string;
  key: string;
}


// ─── UPLOADER CONFIGURATION ───

export interface UploaderConfig {
  /** The backend provider — 'mock' for testing, or a custom UploadProvider */
  provider: 'mock' | UploadProvider;

  /** Base URL of your signing server (used by S3 provider helper) */
  signingUrl?: string;

  /** HTTP method for signing requests: 'GET' or 'POST' (default: 'GET') */
  signingMethod?: 'GET' | 'POST';

  /** Extra headers to send with signing requests */
  signingHeaders?: Record<string, string>;

  /** Extra query params to send with signing requests */
  signingParams?: Record<string, string>;

  /** Whether to send cookies with signing requests (default: false) */
  signingWithCredentials?: boolean;

  /** File size threshold (bytes) above which multipart upload is used.
   *  Default: 100MB (104_857_600) */
  multipartThreshold?: number;

  /** Size of each chunk for multipart uploads (bytes).
   *  Default: 10MB (10_485_760). Minimum: 5MB (S3 requirement). */
  chunkSize?: number;

  /** Maximum number of concurrent chunk uploads.
   *  Default: 4 */
  maxConcurrency?: number;

  /** Retry configuration */
  retry?: RetryConfig;

  /** File validation rules */
  validation?: ValidationConfig;

  /** Auto-upload on file selection? Default: true */
  autoUpload?: boolean;

  /** Scrub/sanitize filenames before upload. Default: built-in scrubber. */
  scrubFilename?: (filename: string) => string;

  /** Add a unique prefix to filenames to avoid collisions. Default: true */
  uniquePrefix?: boolean;

  /** Content-Disposition header behavior: 'inline' | 'attachment' | 'auto' | null.
   *  'auto' = inline for images, attachment for everything else. Default: 'auto' */
  contentDisposition?: 'inline' | 'attachment' | 'auto' | null;

  /** Default S3 path prefix (e.g. "uploads/") */
  path?: string;

  /** Custom headers to include with the PUT upload request */
  uploadHeaders?: Record<string, string>;

  /** Custom metadata to attach to the S3 object */
  metadata?: Record<string, string>;
}


// ─── RETRY CONFIGURATION ───

export interface RetryConfig {
  /** Max number of retries before giving up. Default: 3 */
  maxRetries?: number;
  /** Initial delay in ms before first retry. Default: 1000 */
  initialDelay?: number;
  /** Backoff multiplier. Default: 2 (exponential) */
  backoffMultiplier?: number;
  /** Maximum delay between retries in ms. Default: 30000 */
  maxDelay?: number;
  /** HTTP status codes that should trigger a retry. Default: [408, 429, 500, 502, 503, 504] */
  retryableStatuses?: number[];
  /** Custom function to determine if an error is retryable */
  shouldRetry?: (error: UploadError, attempt: number) => boolean;
}


// ─── VALIDATION CONFIGURATION ───

export interface ValidationConfig {
  /** Maximum file size in bytes. Null = no limit. */
  maxFileSize?: number | null;
  /** Minimum file size in bytes. Default: 1 */
  minFileSize?: number;
  /** Allowed MIME types. e.g. ['image/jpeg', 'image/png', 'application/pdf']
   *  Supports wildcards: ['image/*'] */
  allowedTypes?: string[];
  /** Blocked MIME types (takes precedence over allowedTypes) */
  blockedTypes?: string[];
  /** Allowed file extensions. e.g. ['.jpg', '.png', '.pdf'] */
  allowedExtensions?: string[];
  /** Maximum number of files in a batch upload. Default: no limit. */
  maxFiles?: number;
  /** Custom validation function. Return null if valid, or an error message string. */
  custom?: (file: File) => string | null | Promise<string | null>;
  /** Image-specific validation (only checked for image/* MIME types) */
  image?: ImageValidationConfig;
}

export interface ImageValidationConfig {
  /** Max width in pixels */
  maxWidth?: number;
  /** Max height in pixels */
  maxHeight?: number;
  /** Min width in pixels */
  minWidth?: number;
  /** Min height in pixels */
  minHeight?: number;
  /** Required aspect ratio, e.g. 16/9. Tolerance of ±0.01 applied. */
  aspectRatio?: number;
}


// ─── UPLOAD STATE & EVENTS ───

export type UploadStatus =
  | 'idle'          // File added but upload not started
  | 'validating'    // Running validation checks
  | 'signing'       // Getting pre-signed URL from server
  | 'uploading'     // Actively uploading bytes
  | 'paused'        // Upload paused (multipart only)
  | 'completing'    // Assembling multipart parts on S3
  | 'success'       // Upload completed successfully
  | 'error'         // Upload failed
  | 'aborted';      // Upload was cancelled by user

export interface UploadProgress {
  /** Bytes uploaded so far */
  loaded: number;
  /** Total file size in bytes */
  total: number;
  /** Percentage 0–100 */
  percent: number;
  /** Upload speed in bytes/second (rolling average over last 3 seconds) */
  speed: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining: number;
  /** For multipart: which parts are complete */
  completedParts?: number;
  /** For multipart: total number of parts */
  totalParts?: number;
}

export interface UploadResult {
  /** The public URL of the uploaded file */
  url: string;
  /** The S3 object key */
  key: string;
  /** Original filename */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** MIME type */
  contentType: string;
  /** ETag from S3 */
  etag?: string;
}

export interface UploadTask {
  /** Unique ID for this upload task */
  id: string;
  /** The File object being uploaded */
  file: File;
  /** Current upload status */
  status: UploadStatus;
  /** Current progress (null if not started) */
  progress: UploadProgress | null;
  /** Result (only when status === 'success') */
  result: UploadResult | null;
  /** Error (only when status === 'error') */
  error: UploadError | null;
  /** Metadata attached to this upload */
  metadata?: Record<string, string>;
}


// ─── EVENT MAP ───
// The uploader emits these events. Framework wrappers subscribe to them.

export interface UploaderEventMap {
  /** Fired when a file is added to the upload queue */
  'file:added': { task: UploadTask };
  /** Fired when a file fails validation */
  'file:invalid': { task: UploadTask; errors: string[] };
  /** Fired when a file is removed from the queue */
  'file:removed': { taskId: string };
  /** Fired when upload starts for a file */
  'upload:start': { task: UploadTask };
  /** Fired periodically during upload with progress info */
  'upload:progress': { task: UploadTask; progress: UploadProgress };
  /** Fired when upload completes successfully */
  'upload:success': { task: UploadTask; result: UploadResult };
  /** Fired when upload fails */
  'upload:error': { task: UploadTask; error: UploadError };
  /** Fired when upload is aborted by user */
  'upload:abort': { task: UploadTask };
  /** Fired when upload is paused (multipart only) */
  'upload:pause': { task: UploadTask };
  /** Fired when upload is resumed */
  'upload:resume': { task: UploadTask };
  /** Fired when all uploads in the queue are complete */
  'queue:complete': { successful: UploadTask[]; failed: UploadTask[] };
}


// ─── PUBLIC UPLOADER INSTANCE ───
// This is what createUploader() returns.

export interface Uploader {
  /** Add one or more files to the upload queue.
   *  If autoUpload is true, starts uploading immediately. */
  addFiles(files: File | File[] | FileList): UploadTask[];

  /** Start uploading a specific task (when autoUpload is false) */
  upload(taskId: string): void;

  /** Start uploading all pending tasks */
  uploadAll(): void;

  /** Abort a specific upload */
  abort(taskId: string): void;

  /** Abort all active uploads */
  abortAll(): void;

  /** Pause a multipart upload */
  pause(taskId: string): void;

  /** Resume a paused multipart upload */
  resume(taskId: string): void;

  /** Remove a task from the queue (aborts if active) */
  remove(taskId: string): void;

  /** Clear all completed/failed/aborted tasks from the queue */
  clearCompleted(): void;

  /** Get a snapshot of all current tasks */
  getTasks(): UploadTask[];

  /** Get a specific task by ID */
  getTask(taskId: string): UploadTask | null;

  /** Subscribe to an event */
  on<K extends keyof UploaderEventMap>(
    event: K,
    handler: (data: UploaderEventMap[K]) => void
  ): () => void;

  /** Subscribe to an event, fire once then auto-unsubscribe */
  once<K extends keyof UploaderEventMap>(
    event: K,
    handler: (data: UploaderEventMap[K]) => void
  ): () => void;

  /** Remove all listeners and abort all uploads. Call when unmounting. */
  destroy(): void;
}


// ─── ERRORS ───

export type UploadErrorCode =
  | 'VALIDATION_ERROR'        // File failed validation
  | 'SIGNING_ERROR'           // Failed to get signed URL from server
  | 'UPLOAD_ERROR'            // HTTP error during upload PUT
  | 'MULTIPART_INIT_ERROR'    // Failed to initiate multipart upload
  | 'MULTIPART_PART_ERROR'    // Failed to upload a specific part
  | 'MULTIPART_COMPLETE_ERROR'// Failed to assemble parts
  | 'ABORT_ERROR'             // Upload was aborted
  | 'NETWORK_ERROR'           // Network connectivity issue
  | 'TIMEOUT_ERROR'           // Request timed out
  | 'UNKNOWN_ERROR';          // Unexpected error

export class UploadError extends Error {
  code: UploadErrorCode;
  statusCode?: number;
  taskId?: string;
  partNumber?: number;
  retryable: boolean;

  constructor(
    message: string,
    code: UploadErrorCode,
    options?: {
      statusCode?: number;
      taskId?: string;
      partNumber?: number;
      retryable?: boolean;
      cause?: Error;
    }
  );
}
```

### 2.3 createUploader() Factory (uploader.ts)

```ts
import type { UploaderConfig, Uploader } from './types';

/**
 * Create a new uploader instance.
 *
 * @example
 * // Mock mode — works immediately, no server needed
 * const uploader = createUploader({ provider: 'mock' });
 *
 * @example
 * // Real S3 mode — requires a signing server
 * const uploader = createUploader({
 *   provider: createS3Provider({ signingUrl: '/api/s3/sign' }),
 * });
 *
 * @example
 * // With validation and retry
 * const uploader = createUploader({
 *   provider: createS3Provider({ signingUrl: '/api/s3/sign' }),
 *   validation: {
 *     maxFileSize: 50 * 1024 * 1024, // 50MB
 *     allowedTypes: ['image/*', 'application/pdf'],
 *   },
 *   retry: { maxRetries: 3 },
 *   multipartThreshold: 100 * 1024 * 1024, // 100MB
 * });
 */
export function createUploader(config: UploaderConfig): Uploader;
```

### 2.4 Mock Provider (providers/mock-provider.ts)

The mock provider ships with core and is the default for all examples, Storybook, and unit tests. It simulates the full upload lifecycle in-memory.

Configuration options:
```ts
export interface MockProviderConfig {
  /** Simulated delay for signing requests (ms). Default: 200 */
  signingDelay?: number;
  /** Simulated upload speed (bytes/second). Default: 1_000_000 (1MB/s) */
  uploadSpeed?: number;
  /** Probability of a random failure (0-1). Default: 0 */
  failRate?: number;
  /** Specific error to throw when failRate triggers. Default: 500 status code */
  failError?: { statusCode: number; message: string };
  /** Simulated delay for multipart completion (ms). Default: 500 */
  completionDelay?: number;
  /** Base URL for generated fake public URLs. Default: 'https://mock-bucket.s3.amazonaws.com' */
  baseUrl?: string;
}

export function createMockProvider(config?: MockProviderConfig): UploadProvider;
```

Implementation notes:
- Uses `setTimeout` to simulate network delays
- Tracks progress using `requestAnimationFrame` or `setInterval` to emit realistic progress events
- Generates deterministic fake URLs: `{baseUrl}/{path}/{uniquePrefix}-{filename}`
- Stores nothing — purely simulates the HTTP lifecycle
- Multipart mock: simulates chunk-by-chunk progress with per-part timing

### 2.5 S3 Provider (providers/s3-provider.ts)

This is a helper that talks to a signing server. It does NOT import the AWS SDK — it calls your backend which does the actual AWS signing.

```ts
export interface S3ProviderConfig {
  /** URL of your signing endpoint. e.g. '/api/s3/sign' or 'https://api.example.com/s3/sign' */
  signingUrl: string;

  /** HTTP method for signing requests. Default: 'GET' */
  signingMethod?: 'GET' | 'POST';

  /** Extra headers to include with signing requests (e.g. auth tokens) */
  signingHeaders?: Record<string, string> | (() => Record<string, string>);

  /** Extra query params for signing requests */
  signingParams?: Record<string, string>;

  /** Send cookies with signing requests (CORS). Default: false */
  withCredentials?: boolean;

  /** URL for multipart operations. Defaults to signingUrl + '/multipart' */
  multipartUrl?: string;

  /** Custom request function for signing (override fetch).
   *  Useful for interceptors or custom auth. */
  requestFn?: (url: string, options: RequestInit) => Promise<Response>;
}

export function createS3Provider(config: S3ProviderConfig): UploadProvider;
```

Implementation notes:
- Uses `fetch` for all HTTP requests (no XHR)
- Uses `AbortController` for cancellation
- The actual PUT upload to S3 uses `XMLHttpRequest` because `fetch` does not support upload progress events; wrap XHR in a Promise with abort signal
- The signing server is expected to return JSON: `{ signedUrl, publicUrl, key, headers? }`
- For multipart: the signing server must implement 4 endpoints (initiate, signPart, complete, abort) — or a single endpoint with different actions in the request body
- Never handles AWS credentials — all credential logic stays server-side

### 2.6 Upload Manager (upload-manager.ts)

Orchestrates the upload queue:
- Maintains an ordered `Map<string, UploadTask>` of all tasks
- Decides single-file vs multipart based on `multipartThreshold`
- Limits concurrent uploads via `maxConcurrency`
- Calculates rolling upload speed (3-second window) and ETA
- Emits events through the typed event emitter

Upload flow for single file:
1. Validate file → emit `file:added` or `file:invalid`
2. Call `provider.getSignedUrl()` → status becomes `signing`
3. PUT file to signed URL using XHR → status becomes `uploading`, emit `upload:progress`
4. On success → status becomes `success`, emit `upload:success`
5. On error → check retry strategy → retry or emit `upload:error`

Upload flow for multipart:
1. Validate file → emit `file:added` or `file:invalid`
2. Call `provider.initiateMultipart()` → get uploadId
3. Split file into chunks of `chunkSize` bytes
4. For each chunk (up to `maxConcurrency` in parallel):
   a. Call `provider.getPartSignedUrl()` for this part
   b. PUT chunk to signed URL
   c. Collect ETag from response
   d. Emit aggregated `upload:progress` (sum of all parts)
5. Call `provider.completeMultipart()` with all ETags → status becomes `completing`
6. On success → emit `upload:success`
7. On any part failure → retry that part; if all retries exhausted, call `provider.abortMultipart()`

### 2.7 File Validation (validators/file-validator.ts)

Validation runs synchronously where possible, async only for image dimension checks.

```ts
export function validateFile(
  file: File,
  config: ValidationConfig
): Promise<{ valid: boolean; errors: string[] }>;
```

Validation order:
1. Check `blockedTypes` first (instant reject)
2. Check `allowedTypes` (supports wildcards like `image/*`)
3. Check `allowedExtensions`
4. Check `minFileSize` and `maxFileSize`
5. If file is `image/*` and `image` config exists, check dimensions (async — requires creating an `Image` object from an object URL)
6. Run `custom` validator if provided

### 2.8 Filename Utilities (utils/filename.ts)

```ts
/** Default filename scrubber — removes unsafe characters */
export function scrubFilename(filename: string): string;

/** Add a unique prefix to prevent collisions. Uses crypto.randomUUID() if available, else timestamp+random */
export function addUniquePrefix(filename: string): string;

/** Detect Content-Disposition value based on MIME type */
export function getContentDisposition(
  filename: string,
  contentType: string,
  mode: 'inline' | 'attachment' | 'auto'
): string;
```

### 2.9 Event Emitter (utils/event-emitter.ts)

Tiny typed event emitter (~40 lines). No dependencies.

```ts
export class TypedEventEmitter<EventMap extends Record<string, unknown>> {
  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void;
  once<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void;
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void;
  removeAllListeners(): void;
}
```

### 2.10 Retry Strategy (retry/exponential-backoff.ts)

```ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Required<RetryConfig>,
  context: { taskId: string; partNumber?: number }
): Promise<T>;
```

- Exponential backoff: `delay = min(initialDelay * backoffMultiplier^attempt, maxDelay)`
- Adds jitter: `± 25%` random variance to prevent thundering herd
- Only retries errors matching `retryableStatuses` or where `shouldRetry()` returns true
- Network errors (TypeError from fetch) are always retryable

### 2.11 Exports (index.ts)

```ts
// Factory
export { createUploader } from './uploader';

// Providers
export { createS3Provider } from './providers/s3-provider';
export { createMockProvider } from './providers/mock-provider';

// Validation
export { validateFile } from './validators/file-validator';

// Utilities
export { scrubFilename, addUniquePrefix, getContentDisposition } from './utils/filename';
export { getContentType } from './utils/content-type';

// Errors
export { UploadError } from './errors';

// Types — re-export everything
export type {
  Uploader,
  UploaderConfig,
  UploadProvider,
  UploadTask,
  UploadStatus,
  UploadProgress,
  UploadResult,
  UploadError as UploadErrorType,
  UploadErrorCode,
  UploaderEventMap,
  SignedUrlParams,
  SignedUrlResult,
  InitiateMultipartParams,
  MultipartInitResult,
  PartSignedUrlParams,
  CompleteMultipartParams,
  CompletedPart,
  CompleteMultipartResult,
  AbortMultipartParams,
  RetryConfig,
  ValidationConfig,
  ImageValidationConfig,
  MockProviderConfig,
  S3ProviderConfig,
} from './types';
```

### 2.12 package.json (@awesome-s3-uploader/core)

```json
{
  "name": "@awesome-s3-uploader/core",
  "version": "0.1.0",
  "description": "Framework-agnostic S3 file upload engine with multipart support",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "keywords": ["s3", "upload", "aws", "multipart", "file-upload", "presigned-url"],
  "repository": { "type": "git", "url": "https://github.com/YOUR_ORG/@awesome-s3-uploader", "directory": "packages/core" },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tsup": "^8.0.0",
    "vitest": "^2.0.0"
  }
}
```

CRITICAL: Zero `dependencies`. Only `devDependencies`.

---

## Phase 3: @awesome-s3-uploader/react — React Bindings

### 3.1 Source File Structure

```
packages/react/src/
├── index.ts                    # Public API barrel export
├── hooks/
│   ├── use-uploader.ts         # Main hook — creates/manages uploader instance
│   ├── use-upload.ts           # Single-file upload convenience hook
│   └── use-drop-zone.ts        # Drag-and-drop hook
├── components/
│   ├── DropZone.tsx            # Headless drop zone component
│   ├── FileInput.tsx           # Styled file input wrapper
│   └── ProgressBar.tsx         # Simple progress bar component
├── context/
│   └── uploader-context.tsx    # React Context for sharing uploader across components
└── types.ts                    # React-specific types
```

### 3.2 useUploader Hook

This is the primary hook. It wraps `createUploader` and manages React state.

```tsx
export interface UseUploaderOptions extends UploaderConfig {
  // All UploaderConfig options, plus React-specific ones:
}

export interface UseUploaderReturn {
  /** All current upload tasks (reactive — triggers re-render on change) */
  tasks: UploadTask[];

  /** Add files to the upload queue */
  addFiles: (files: File | File[] | FileList) => UploadTask[];

  /** Upload a specific task */
  upload: (taskId: string) => void;

  /** Upload all pending tasks */
  uploadAll: () => void;

  /** Abort a specific upload */
  abort: (taskId: string) => void;

  /** Abort all active uploads */
  abortAll: () => void;

  /** Pause a multipart upload */
  pause: (taskId: string) => void;

  /** Resume a paused upload */
  resume: (taskId: string) => void;

  /** Remove a task from the queue */
  remove: (taskId: string) => void;

  /** Clear all completed/failed/aborted tasks */
  clearCompleted: () => void;

  /** Whether any upload is currently in progress */
  isUploading: boolean;

  /** Aggregated progress across all active uploads */
  totalProgress: UploadProgress | null;

  /** The underlying uploader instance (escape hatch) */
  uploader: Uploader;
}

export function useUploader(options: UseUploaderOptions): UseUploaderReturn;
```

Implementation notes:
- Creates the `Uploader` instance in a `useRef` (stable across re-renders)
- Subscribes to all uploader events in a `useEffect`, updates React state via `useState`
- `tasks` state is updated via functional setState to avoid stale closures
- Cleans up (calls `uploader.destroy()`) on unmount
- Memoizes returned object with `useMemo` to prevent unnecessary re-renders
- Progress updates are throttled to ~60fps using `requestAnimationFrame` to avoid hammering React

### 3.3 useUpload Hook

Convenience hook for simple single-file uploads:

```tsx
export interface UseUploadOptions extends UploaderConfig {}

export interface UseUploadReturn {
  /** Trigger file upload — can be called with a File or opens file picker */
  upload: (file?: File) => void;
  /** Current status */
  status: UploadStatus;
  /** Current progress */
  progress: UploadProgress | null;
  /** Result on success */
  result: UploadResult | null;
  /** Error on failure */
  error: UploadError | null;
  /** Abort the current upload */
  abort: () => void;
  /** Reset state back to idle */
  reset: () => void;
  /** Ref to attach to a hidden <input type="file"> */
  inputRef: React.RefObject<HTMLInputElement>;
}

export function useUpload(options: UseUploadOptions): UseUploadReturn;
```

### 3.4 useDropZone Hook

```tsx
export interface UseDropZoneOptions {
  /** Accepted MIME types, e.g. ['image/*'] */
  accept?: string[];
  /** Allow multiple files? Default: true */
  multiple?: boolean;
  /** Disable the drop zone */
  disabled?: boolean;
  /** Callback when files are dropped/selected */
  onFiles?: (files: File[]) => void;
  /** Callback when invalid files are rejected */
  onReject?: (files: File[], errors: string[]) => void;
  /** Prevent default browser behavior for drag events. Default: true */
  noClick?: boolean;
}

export interface UseDropZoneReturn {
  /** Spread onto the drop zone container element */
  getRootProps: () => React.HTMLAttributes<HTMLElement>;
  /** Spread onto a hidden <input type="file"> */
  getInputProps: () => React.InputHTMLAttributes<HTMLInputElement>;
  /** Whether a file is currently being dragged over the zone */
  isDragActive: boolean;
  /** Whether the dragged file type is accepted */
  isDragAccept: boolean;
  /** Whether the dragged file type is rejected */
  isDragReject: boolean;
  /** Open the native file picker programmatically */
  open: () => void;
}

export function useDropZone(options: UseDropZoneOptions): UseDropZoneReturn;
```

Implementation notes:
- Handles `dragenter`, `dragleave`, `dragover`, `drop` events
- Tracks drag count (handles nested elements correctly)
- Validates file types on drag (reads from `DataTransfer.items`)
- Uses `useCallback` for all returned functions for stable references
- Does NOT depend on `react-dropzone` — zero dependencies

### 3.5 Components

**DropZone.tsx** — Headless, render-prop component wrapping `useDropZone`:

```tsx
export interface DropZoneProps extends UseDropZoneOptions {
  children: (state: UseDropZoneReturn) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Usage:
// <DropZone accept={['image/*']} onFiles={handleFiles}>
//   {({ getRootProps, getInputProps, isDragActive }) => (
//     <div {...getRootProps()} className={isDragActive ? 'active' : ''}>
//       <input {...getInputProps()} />
//       <p>Drag files here</p>
//     </div>
//   )}
// </DropZone>
```

**FileInput.tsx** — Simple styled file input:

```tsx
export interface FileInputProps {
  accept?: string;
  multiple?: boolean;
  onChange: (files: File[]) => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}
```

**ProgressBar.tsx** — Simple progress bar:

```tsx
export interface ProgressBarProps {
  progress: UploadProgress;
  className?: string;
  showSpeed?: boolean;
  showETA?: boolean;
  showPercent?: boolean;
}
```

All components are unstyled/minimally styled — users bring their own CSS. Components use `data-*` attributes for styling hooks (e.g. `data-drag-active="true"`).

### 3.6 UploaderContext

For apps that need to share one uploader instance across multiple components:

```tsx
export const UploaderProvider: React.FC<{
  config: UploaderConfig;
  children: React.ReactNode;
}>;

export function useUploaderContext(): UseUploaderReturn;
```

### 3.7 package.json (@awesome-s3-uploader/react)

```json
{
  "name": "@awesome-s3-uploader/react",
  "version": "0.1.0",
  "description": "React hooks and components for S3 file uploads",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "keywords": ["react", "s3", "upload", "hooks", "drag-drop", "file-upload"],
  "repository": { "type": "git", "url": "https://github.com/YOUR_ORG/@awesome-s3-uploader", "directory": "packages/react" },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@awesome-s3-uploader/core": "workspace:*"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "jsdom": "^25.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "tsup": "^8.0.0",
    "vitest": "^2.0.0"
  }
}
```

CRITICAL: `react` and `react-dom` are `peerDependencies` only. They also appear in `devDependencies` for testing but are NEVER in `dependencies`.

---

## Phase 4: Testing Strategy

### 4.1 Unit Tests (@awesome-s3-uploader/core)

```
packages/core/tests/
├── upload-manager.test.ts          # Core upload flow with mock provider
├── upload-task.test.ts             # State machine transitions
├── multipart-manager.test.ts       # Chunk splitting, part tracking
├── providers/
│   ├── mock-provider.test.ts       # Mock provider behavior
│   └── s3-provider.test.ts         # S3 provider (mock fetch)
├── validators/
│   ├── file-validator.test.ts      # All validation rules
│   └── image-validator.test.ts     # Image dimension checks
├── retry/
│   └── exponential-backoff.test.ts # Retry logic, jitter, max attempts
├── utils/
│   ├── event-emitter.test.ts       # Event subscription/emission
│   ├── filename.test.ts            # Scrubbing, unique prefix
│   └── content-type.test.ts        # MIME detection
└── integration/
    └── full-upload.test.ts         # End-to-end with mock provider
```

Test with Vitest. Use `vi.useFakeTimers()` for timing-dependent tests (retry delays, progress intervals).

Key test scenarios for upload-manager:
- Single file upload: idle → validating → signing → uploading → success
- Single file upload with validation failure
- Single file upload with network error + retry + success
- Single file upload with abort mid-upload
- Multipart upload: chunking, parallel parts, completion
- Multipart upload with one part failing and retrying
- Multipart upload abort → cleanup called
- Queue: max concurrency respected
- Queue: complete event fires after all uploads finish
- Progress: speed calculation, ETA calculation
- Filename scrubbing: special characters, unicode, path traversal

### 4.2 Unit Tests (@awesome-s3-uploader/react)

```
packages/react/tests/
├── hooks/
│   ├── use-uploader.test.tsx       # Hook state management
│   ├── use-upload.test.tsx         # Single-file convenience hook
│   └── use-drop-zone.test.tsx      # Drag-and-drop events
├── components/
│   ├── DropZone.test.tsx           # Render prop component
│   ├── FileInput.test.tsx          # File input wrapper
│   └── ProgressBar.test.tsx        # Progress display
└── context/
    └── uploader-context.test.tsx   # Context provider/consumer
```

Use `@testing-library/react` and `vitest` with `jsdom` environment.

Key test scenarios:
- `useUploader`: tasks state updates on upload lifecycle events
- `useUploader`: cleanup on unmount (destroy called)
- `useUploader`: progress throttling doesn't cause excessive re-renders
- `useDropZone`: drag enter/leave/over/drop events
- `useDropZone`: type validation on drag
- `useDropZone`: nested element drag counting
- `DropZone`: render prop receives correct state
- `UploaderContext`: provides uploader to nested components

### 4.3 Integration Tests (MinIO)

```
packages/core/tests/integration/
├── vitest.integration.config.ts
├── setup.ts                        # Start MinIO, create test bucket
├── teardown.ts                     # Cleanup
├── real-upload.test.ts             # Full upload to MinIO
├── real-multipart.test.ts          # Multipart upload to MinIO
└── real-abort.test.ts              # Abort mid-upload to MinIO
```

**docker-compose.yml:**
```yaml
services:
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5

  createbucket:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb local/test-bucket --ignore-existing;
      mc anonymous set download local/test-bucket;
      "
```

Integration tests use a small Express server (in the test setup) that generates real pre-signed URLs pointing at MinIO instead of AWS S3. These tests only run in CI or when explicitly invoked with `pnpm test:integration`.

---

## Phase 5: Example Applications

### 5.1 examples/react-basic

Minimal React app demonstrating single file upload with mock provider.

```
examples/react-basic/
├── src/
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

Features demonstrated:
- `useUpload` hook for single file
- Progress bar
- Success/error display
- Uses mock provider (works on clone, zero setup)

### 5.2 examples/react-dropzone

Full-featured drag-and-drop multi-file uploader.

```
examples/react-dropzone/
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── Uploader.tsx
│   │   ├── FileList.tsx
│   │   └── FileItem.tsx
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

Features demonstrated:
- `useUploader` hook with multiple files
- `DropZone` component with custom styling
- File list with individual progress bars
- Abort/remove individual files
- File type/size validation with error messages
- Mock provider with simulated failures
- Toggle between mock and real provider

### 5.3 examples/nextjs

Next.js App Router integration.

```
examples/nextjs/
├── app/
│   ├── api/
│   │   └── s3/
│   │       ├── sign/route.ts           # Signing endpoint
│   │       └── multipart/
│   │           ├── initiate/route.ts
│   │           ├── sign-part/route.ts
│   │           ├── complete/route.ts
│   │           └── abort/route.ts
│   ├── page.tsx
│   └── layout.tsx
├── components/
│   └── Uploader.tsx
├── package.json
├── next.config.js
├── .env.example                        # AWS_ACCESS_KEY_ID=..., etc.
└── README.md
```

### 5.4 examples/vanilla-js

No framework, plain HTML + JavaScript.

```
examples/vanilla-js/
├── index.html
├── upload.js
└── README.md
```

Demonstrates using `@awesome-s3-uploader/core` directly with vanilla DOM manipulation.

### 5.5 examples/server/node-express

Backend signing server using Express + AWS SDK v3.

```
examples/server/node-express/
├── server.js
├── package.json
├── .env.example
└── README.md
```

Implements all required endpoints:
- `GET /api/s3/sign` — returns signed URL for single upload
- `POST /api/s3/multipart/initiate` — initiate multipart
- `GET /api/s3/multipart/sign-part` — sign individual part
- `POST /api/s3/multipart/complete` — assemble parts
- `POST /api/s3/multipart/abort` — abort and cleanup

Uses `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.

### 5.6 examples/server/serverless-aws

AWS Lambda + API Gateway.

```
examples/server/serverless-aws/
├── handler.ts
├── serverless.yml                      # Serverless Framework config
├── package.json
├── .env.example
└── README.md
```

### 5.7 examples/server/python-flask

Python Flask signing server.

```
examples/server/python-flask/
├── app.py
├── requirements.txt
├── .env.example
└── README.md
```

---

## Phase 6: Documentation (Docusaurus)

### 6.1 Setup

```
docs/
├── docs/
│   ├── getting-started/
│   │   ├── introduction.md
│   │   ├── installation.md
│   │   ├── quick-start.md
│   │   └── mock-mode.md
│   ├── guides/
│   │   ├── single-file-upload.md
│   │   ├── multi-file-upload.md
│   │   ├── drag-and-drop.md
│   │   ├── multipart-uploads.md
│   │   ├── file-validation.md
│   │   ├── retry-and-error-handling.md
│   │   ├── progress-tracking.md
│   │   ├── custom-providers.md
│   │   └── migration-from-react-s3-uploader.md
│   ├── api/
│   │   ├── core/
│   │   │   ├── create-uploader.md
│   │   │   ├── create-s3-provider.md
│   │   │   ├── create-mock-provider.md
│   │   │   ├── types.md
│   │   │   └── errors.md
│   │   └── react/
│   │       ├── use-uploader.md
│   │       ├── use-upload.md
│   │       ├── use-drop-zone.md
│   │       ├── drop-zone.md
│   │       └── uploader-context.md
│   ├── server-setup/
│   │   ├── overview.md
│   │   ├── express.md
│   │   ├── nextjs.md
│   │   ├── serverless.md
│   │   ├── python.md
│   │   └── cors-configuration.md
│   └── advanced/
│       ├── custom-xhr.md
│       ├── presigned-url-format.md
│       ├── s3-bucket-policy.md
│       └── performance-tuning.md
├── src/
│   ├── components/
│   │   ├── LiveDemo.tsx                # Interactive upload demo (mock provider)
│   │   └── HomepageFeatures.tsx
│   ├── pages/
│   │   └── index.tsx                   # Landing page
│   └── css/
│       └── custom.css
├── static/
│   └── img/
│       └── logo.svg
├── docusaurus.config.ts
├── sidebars.ts
├── package.json
└── tsconfig.json
```

### 6.2 Docusaurus Configuration

```ts
// docusaurus.config.ts
import type { Config } from '@docusaurus/types';

const config: Config = {
  title: '@awesome-s3-uploader',
  tagline: 'Modern S3 file uploads for every JavaScript framework',
  url: 'https://YOUR_ORG.github.io',
  baseUrl: '/@awesome-s3-uploader/',
  organizationName: 'YOUR_ORG',
  projectName: '@awesome-s3-uploader',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/YOUR_ORG/@awesome-s3-uploader/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: '@awesome-s3-uploader',
      items: [
        { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs' },
        { href: 'https://github.com/YOUR_ORG/@awesome-s3-uploader', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/getting-started/introduction' },
            { label: 'API Reference', to: '/docs/api/core/create-uploader' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub Discussions', href: 'https://github.com/YOUR_ORG/@awesome-s3-uploader/discussions' },
            { label: 'Issues', href: 'https://github.com/YOUR_ORG/@awesome-s3-uploader/issues' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} @awesome-s3-uploader Contributors. MIT License.`,
    },
    prism: {
      theme: require('prism-react-renderer').themes.github,
      darkTheme: require('prism-react-renderer').themes.dracula,
    },
    algolia: {
      // Apply for DocSearch at https://docsearch.algolia.com/
      // Fill in after approval. Site works without it (no search).
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: '@awesome-s3-uploader',
    },
  },
};

export default config;
```

### 6.3 Interactive Live Demo

The landing page and Quick Start guide will embed a `<LiveDemo />` React component that uses the mock provider. Users can drag a file, see progress, and see the result — all in the browser with zero backend. This is built as a regular React component inside `docs/src/components/LiveDemo.tsx` and embedded in MDX pages.

### 6.4 Migration Guide

`docs/docs/guides/migration-from-react-s3-uploader.md` should include:
- Side-by-side comparison of old props vs new API
- Step-by-step migration for each prop/feature
- Common patterns that have changed
- FAQ for edge cases

---

## Phase 7: CI/CD & GitHub Actions

### 7.1 CI Workflow (.github/workflows/ci.yml)

Runs on every PR and push to main:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  integration-tests:
    runs-on: ubuntu-latest
    services:
      minio:
        image: minio/minio:latest
        ports: ['9000:9000']
        env:
          MINIO_ROOT_USER: minioadmin
          MINIO_ROOT_PASSWORD: minioadmin
        options: >-
          --health-cmd "mc ready local"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:integration
        env:
          MINIO_ENDPOINT: http://localhost:9000
          MINIO_ACCESS_KEY: minioadmin
          MINIO_SECRET_KEY: minioadmin
          MINIO_BUCKET: test-bucket

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

### 7.2 Release Workflow (.github/workflows/release.yml)

Triggered when changesets are merged:

```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test
      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 7.3 Docs Deployment (.github/workflows/docs.yml)

Deploys Docusaurus to GitHub Pages:

```yaml
name: Deploy Docs
on:
  push:
    branches: [main]
    paths: ['docs/**', 'packages/*/README.md']

permissions:
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm docs:build
      - uses: actions/upload-pages-artifact@v3
        with: { path: docs/build }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## Phase 8: Community & Open Source Essentials

### 8.1 README.md (root)

Must include:
- Badges: npm version, CI status, license, bundle size
- One-sentence description
- "Why @awesome-s3-uploader?" section (comparison to react-s3-uploader)
- Quick start code snippet (5 lines, mock mode)
- Feature list
- Links to docs, examples, contributing guide
- Package table showing all packages with descriptions

### 8.2 Per-package README.md

Each package (`core`, `react`) gets its own README with:
- Installation command
- Basic usage example
- Link to full docs
- API overview

### 8.3 CONTRIBUTING.md

- Prerequisites (Node 18+, pnpm 9+, Docker for integration tests)
- Setup instructions (`pnpm install`, `pnpm build`, `pnpm test`)
- How to run examples locally
- PR guidelines, commit conventions
- How to add a changeset
- Code style guide
- Architecture overview

### 8.4 Issue & PR Templates

Bug report template fields: version, browser, OS, reproduction steps, expected vs actual, code snippet.

Feature request template fields: description, motivation, proposed API, alternatives considered.

### 8.5 LICENSE

MIT License.

---

## Implementation Order (for Claude IDE)

Execute in this exact order. Each step should result in working, testable code before moving to the next.

### Step 1: Scaffold the monorepo
Set up the root project structure, pnpm workspace, tsconfig, eslint, prettier. Verify `pnpm install` and `pnpm build` work (even if packages are empty stubs).

### Step 2: Build @awesome-s3-uploader/core types and event emitter
Create `types.ts` with all interfaces and `utils/event-emitter.ts`. Write tests for the event emitter.

### Step 3: Build @awesome-s3-uploader/core utilities
Implement `filename.ts`, `content-type.ts`, `unique-id.ts`, `abort-controller.ts`. Write tests.

### Step 4: Build @awesome-s3-uploader/core validators
Implement `file-validator.ts` and `image-validator.ts`. Write tests covering all validation rules.

### Step 5: Build @awesome-s3-uploader/core retry strategy
Implement `exponential-backoff.ts`. Write tests with fake timers.

### Step 6: Build @awesome-s3-uploader/core mock provider
Implement `mock-provider.ts` with configurable delays and failure simulation. Write tests.

### Step 7: Build @awesome-s3-uploader/core upload manager (single file)
Implement single-file upload flow through the upload manager. Wire up events, progress tracking, abort. Write tests using mock provider.

### Step 8: Build @awesome-s3-uploader/core multipart upload
Implement `multipart-manager.ts` and `chunk-worker.ts`. Add multipart flow to upload manager. Write tests.

### Step 9: Build @awesome-s3-uploader/core S3 provider
Implement `s3-provider.ts` that talks to a signing server. Write tests mocking `fetch`.

### Step 10: Build @awesome-s3-uploader/core createUploader factory
Wire everything together in `uploader.ts`. Set up barrel exports in `index.ts`. Write integration test using mock provider end-to-end.

### Step 11: Build @awesome-s3-uploader/react hooks
Implement `useUploader`, `useUpload`, `useDropZone`. Write tests with @testing-library/react.

### Step 12: Build @awesome-s3-uploader/react components
Implement `DropZone`, `FileInput`, `ProgressBar`, `UploaderContext`. Write tests.

### Step 13: Build examples
Create all example apps. Every example should work out of the box with mock provider.

### Step 14: Set up Docusaurus
Initialize docs site, configure for GitHub Pages, write getting started guides and API reference.

### Step 15: Set up CI/CD
Create GitHub Actions workflows for CI, release, and docs deployment.

### Step 16: Integration tests with MinIO
Set up docker-compose, write integration tests, add to CI.

### Step 17: Polish
Final README, CONTRIBUTING.md, issue templates, migration guide, interactive demo on docs site.

---

## Future Phases (Not in Scope for Phase 1)

### Phase 2: Framework Expansion
- `@awesome-s3-uploader/vue` — Vue 3 composables (`useUploader`, `useUpload`, `useDropZone`)
- `@awesome-s3-uploader/svelte` — Svelte stores and actions
- `@awesome-s3-uploader/angular` — Injectable service with RxJS observables
- `@awesome-s3-uploader/solid` — SolidJS primitives

### Phase 3: Ecosystem
- Additional providers: Google Cloud Storage, Azure Blob, Cloudflare R2, DigitalOcean Spaces
- Pre-built UI component library (styled drop zones, file grids, image previews)
- Image preprocessing: client-side resize/compress before upload
- Server SDK helpers: `@awesome-s3-uploader/server-express`, `@awesome-s3-uploader/server-next`
- CLI tool: `npx @awesome-s3-uploader init` to scaffold server + client config
- Resumable uploads: persist upload state to localStorage, resume across page reloads
- Web Worker support: offload chunking/hashing to a worker thread
