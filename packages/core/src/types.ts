export interface UploadProvider {
  getSignedUrl(params: SignedUrlParams): Promise<SignedUrlResult>;
  initiateMultipart(params: InitiateMultipartParams): Promise<MultipartInitResult>;
  getPartSignedUrl(params: PartSignedUrlParams): Promise<SignedUrlResult>;
  completeMultipart(params: CompleteMultipartParams): Promise<CompleteMultipartResult>;
  abortMultipart(params: AbortMultipartParams): Promise<void>;
}

export interface SignedUrlParams {
  fileName: string;
  contentType: string;
  fileSize: number;
  metadata?: Record<string, string>;
  path?: string;
}

export interface SignedUrlResult {
  signedUrl: string;
  publicUrl: string;
  key: string;
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

export interface UploaderConfig {
  provider: 'mock' | UploadProvider;
  signingUrl?: string;
  signingMethod?: 'GET' | 'POST';
  signingHeaders?: Record<string, string>;
  signingParams?: Record<string, string>;
  signingWithCredentials?: boolean;
  multipartThreshold?: number;
  chunkSize?: number;
  maxConcurrency?: number;
  retry?: RetryConfig;
  validation?: ValidationConfig;
  autoUpload?: boolean;
  scrubFilename?: (filename: string) => string;
  uniquePrefix?: boolean;
  contentDisposition?: 'inline' | 'attachment' | 'auto' | null;
  path?: string;
  uploadHeaders?: Record<string, string>;
  metadata?: Record<string, string>;
}

export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  retryableStatuses?: number[];
  shouldRetry?: (error: UploadError, attempt: number) => boolean;
}

export interface ValidationConfig {
  maxFileSize?: number | null;
  minFileSize?: number;
  allowedTypes?: string[];
  blockedTypes?: string[];
  allowedExtensions?: string[];
  maxFiles?: number;
  custom?: (file: File) => string | null | Promise<string | null>;
  image?: ImageValidationConfig;
}

export interface ImageValidationConfig {
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: number;
}

export type UploadStatus =
  | 'idle'
  | 'validating'
  | 'signing'
  | 'uploading'
  | 'paused'
  | 'completing'
  | 'success'
  | 'error'
  | 'aborted';

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
  speed: number;
  estimatedTimeRemaining: number;
  completedParts?: number;
  totalParts?: number;
}

export interface UploadResult {
  url: string;
  key: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  etag?: string;
}

export interface UploadTask {
  id: string;
  file: File;
  status: UploadStatus;
  progress: UploadProgress | null;
  result: UploadResult | null;
  error: UploadError | null;
  metadata?: Record<string, string>;
}

export interface UploaderEventMap {
  'file:added': { task: UploadTask };
  'file:invalid': { task: UploadTask; errors: string[] };
  'file:removed': { taskId: string };
  'upload:start': { task: UploadTask };
  'upload:progress': { task: UploadTask; progress: UploadProgress };
  'upload:success': { task: UploadTask; result: UploadResult };
  'upload:error': { task: UploadTask; error: UploadError };
  'upload:abort': { task: UploadTask };
  'upload:pause': { task: UploadTask };
  'upload:resume': { task: UploadTask };
  'queue:complete': { successful: UploadTask[]; failed: UploadTask[] };
}

export interface Uploader {
  addFiles(files: File | File[] | FileList): UploadTask[];
  upload(taskId: string): void;
  uploadAll(): void;
  abort(taskId: string): void;
  abortAll(): void;
  pause(taskId: string): void;
  resume(taskId: string): void;
  remove(taskId: string): void;
  clearCompleted(): void;
  getTasks(): UploadTask[];
  getTask(taskId: string): UploadTask | null;
  on<K extends keyof UploaderEventMap>(
    event: K,
    handler: (data: UploaderEventMap[K]) => void
  ): () => void;
  once<K extends keyof UploaderEventMap>(
    event: K,
    handler: (data: UploaderEventMap[K]) => void
  ): () => void;
  destroy(): void;
}

export type UploadErrorCode =
  | 'VALIDATION_ERROR'
  | 'SIGNING_ERROR'
  | 'UPLOAD_ERROR'
  | 'MULTIPART_INIT_ERROR'
  | 'MULTIPART_PART_ERROR'
  | 'MULTIPART_COMPLETE_ERROR'
  | 'ABORT_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

export class UploadError extends Error {
  code: UploadErrorCode;
  statusCode?: number;
  taskId?: string;
  partNumber?: number;
  retryable: boolean;
  cause?: Error;

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
  ) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
    this.statusCode = options?.statusCode;
    this.taskId = options?.taskId;
    this.partNumber = options?.partNumber;
    this.retryable = options?.retryable ?? false;

    if (options?.cause) {
      this.cause = options.cause;
    }

    Object.setPrototypeOf(this, UploadError.prototype);
  }
}
