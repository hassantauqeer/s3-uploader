export { useUploader } from './hooks/use-uploader';
export { useUpload } from './hooks/use-upload';

export type { UseUploaderReturn } from './hooks/use-uploader';
export type { UseUploadReturn } from './hooks/use-upload';

// Re-export core functions for convenience
export { createS3Provider, createMockProvider, createUploader } from '@ht/s3-uploader-core';

export type {
  Uploader,
  UploaderConfig,
  UploadProvider,
  UploadTask,
  UploadStatus,
  UploadProgress,
  UploadResult,
  UploadError,
  UploadErrorCode,
  UploaderEventMap,
  ValidationConfig,
  ImageValidationConfig,
  RetryConfig,
} from '@ht/s3-uploader-core';
