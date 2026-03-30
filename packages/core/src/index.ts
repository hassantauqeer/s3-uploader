export { createUploader } from './uploader';

export { createS3Provider } from './providers/s3-provider';
export { createMockProvider } from './providers/mock-provider';

export { validateFile } from './validators/file-validator';

export { scrubFilename, addUniquePrefix, getContentDisposition } from './utils/filename';
export { getContentType } from './utils/content-type';

export { UploadError } from './types';

export type {
  Uploader,
  UploaderConfig,
  UploadProvider,
  UploadTask,
  UploadStatus,
  UploadProgress,
  UploadResult,
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
} from './types';

export type { MockProviderConfig } from './providers/mock-provider';
export type { S3ProviderConfig } from './providers/s3-provider';
