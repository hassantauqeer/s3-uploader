# @awesome-s3-uploader/core

Framework-agnostic S3 file upload engine with intelligent multipart support, parallel uploads, and flexible authentication.

## Features

- ✅ **Single & Multipart Uploads** - Automatic multipart for large files (opt-in)
- ✅ **Parallel Part Uploads** - Configurable concurrency (default: 3)
- ✅ **Flexible Authentication** - URL-based or custom signer functions
- ✅ **Progress Tracking** - Real-time upload progress events
- ✅ **File Validation** - Size, type, and custom validation
- ✅ **Retry Logic** - Exponential backoff for failed uploads
- ✅ **TypeScript** - Full type safety
- ✅ **Framework Agnostic** - Works with any JavaScript framework

## Installation

```bash
npm install @awesome-s3-uploader/core
# or
pnpm add @awesome-s3-uploader/core
# or
yarn add @awesome-s3-uploader/core
```

## Quick Start

### Mock Mode (No Server Required)

```typescript
import { createUploader } from '@awesome-s3-uploader/core';

const uploader = createUploader({ provider: 'mock' });

uploader.on('upload:success', ({ result }) => {
  console.log('Upload complete:', result.url);
});

const tasks = uploader.addFiles(fileInput.files);
```

### Simple S3 Upload (URL-based)

```typescript
import { createUploader, createS3Provider } from '@awesome-s3-uploader/core';

const uploader = createUploader({
  provider: createS3Provider({
    signingUrl: 'https://api.example.com/sign',
  }),
  validation: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['image/*', 'application/pdf'],
  },
});

uploader.on('upload:progress', ({ task, progress }) => {
  console.log(`${task.file.name}: ${progress.percent}%`);
});

uploader.on('upload:success', ({ result }) => {
  console.log('Uploaded:', result.url);
});

const tasks = uploader.addFiles(files);
```

## Multipart Uploads

Multipart uploads are **opt-in** by default. Enable them by setting `multipartThreshold`:

```typescript
const uploader = createUploader({
  provider: createS3Provider({
    signingUrl: 'https://api.example.com/sign',
    multipartUrl: 'https://api.example.com/multipart',
    multipartThreshold: 5 * 1024 * 1024, // 5MB - files larger than this use multipart
    chunkSize: 5 * 1024 * 1024, // 5MB chunks
    maxConcurrency: 3, // Upload 3 parts in parallel
  }),
});
```

### Multipart with Custom Signers

```typescript
const uploader = createUploader({
  provider: createS3Provider({
    signingUrl: 'https://api.example.com/sign',
    multipartSigner: {
      initiate: async (file, params) => {
        const response = await fetch('/api/multipart/initiate', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        return response.json(); // { uploadId, key }
      },
      signPart: async (file, params) => {
        const response = await fetch('/api/multipart/sign-part', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        return response.json(); // { signedUrl, key }
      },
      complete: async (file, params) => {
        const response = await fetch('/api/multipart/complete', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        return response.json(); // { publicUrl, key, etag }
      },
      abort: async (file, params) => {
        await fetch('/api/multipart/abort', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
    },
    multipartThreshold: 5 * 1024 * 1024,
    chunkSize: 5 * 1024 * 1024,
  }),
});
```

## Authentication

### URL-based Signing (Simple)

```typescript
const provider = createS3Provider({
  signingUrl: 'https://api.example.com/sign',
  signingMethod: 'GET', // or 'POST'
  signingHeaders: {
    'Authorization': 'Bearer token',
  },
});
```

### Custom Signer Function (Advanced)

```typescript
const provider = createS3Provider({
  signer: async (file, params) => {
    const response = await fetch('https://api.example.com/sign', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: params.fileName,
        contentType: params.contentType,
        fileSize: params.fileSize,
      }),
    });
    
    return response.json(); // { signedUrl, publicUrl, key }
  },
});
```

## Configuration Options

### Provider Config

```typescript
interface S3ProviderConfig {
  // Simple mode: URL-based signing
  signingUrl?: string;
  signingMethod?: 'GET' | 'POST';
  signingHeaders?: Record<string, string> | (() => Record<string, string>);
  signingParams?: Record<string, string>;
  withCredentials?: boolean;
  multipartUrl?: string;
  
  // Advanced mode: Custom signer functions
  signer?: SignerFunction;
  multipartSigner?: MultipartSignerFunctions;
  
  // Multipart configuration
  multipartThreshold?: number; // Default: Infinity (disabled)
  chunkSize?: number; // Default: 10MB
  maxConcurrency?: number; // Default: 3
}
```

### Uploader Config

```typescript
interface UploaderConfig {
  provider: UploadProvider | 'mock';
  validation?: {
    maxFileSize?: number;
    allowedTypes?: string[]; // Supports wildcards: 'image/*', '*'
    customValidator?: (file: File) => Promise<ValidationResult>;
  };
  retry?: {
    maxRetries?: number; // Default: 3
    initialDelay?: number; // Default: 1000ms
    maxDelay?: number; // Default: 30000ms
  };
  autoUpload?: boolean; // Default: true
  path?: string; // S3 path prefix
}
```

## Default Values

| Option | Default | Description |
|--------|---------|-------------|
| `multipartThreshold` | `Infinity` | Multipart disabled by default (opt-in) |
| `chunkSize` | `10MB` | Size of each part in multipart upload |
| `maxConcurrency` | `3` | Number of parts uploaded in parallel |
| `maxRetries` | `3` | Maximum retry attempts |
| `autoUpload` | `true` | Start upload automatically |

## Events

```typescript
uploader.on('upload:start', ({ task }) => {});
uploader.on('upload:progress', ({ task, progress }) => {});
uploader.on('upload:success', ({ task, result }) => {});
uploader.on('upload:error', ({ task, error }) => {});
uploader.on('upload:abort', ({ task }) => {});
uploader.on('file:invalid', ({ task, errors }) => {});
```

## File Validation

### Wildcard Support

```typescript
const uploader = createUploader({
  provider,
  validation: {
    allowedTypes: [
      'image/*',        // All images
      'video/*',        // All videos
      'application/pdf', // Specific type
      '*',              // All types
    ],
  },
});
```

## Examples

### Basic Upload

```typescript
const uploader = createUploader({
  provider: createS3Provider({
    signingUrl: '/api/sign',
  }),
});

const tasks = uploader.addFiles(files);
```

### Multipart Upload with Progress

```typescript
const uploader = createUploader({
  provider: createS3Provider({
    signingUrl: '/api/sign',
    multipartUrl: '/api/multipart',
    multipartThreshold: 5 * 1024 * 1024,
    chunkSize: 5 * 1024 * 1024,
    maxConcurrency: 5, // Upload 5 parts in parallel
  }),
});

uploader.on('upload:progress', ({ task, progress }) => {
  console.log(`${task.file.name}: ${progress.percent}%`);
  console.log(`Speed: ${progress.speed} bytes/s`);
  console.log(`ETA: ${progress.estimatedTimeRemaining}s`);
});

const tasks = uploader.addFiles(largeFiles);
```

### Manual Upload Control

```typescript
const uploader = createUploader({
  provider,
  autoUpload: false,
});

const tasks = uploader.addFiles(files);

// Start specific upload
uploader.startUpload(tasks[0].id);

// Abort upload
uploader.abortUpload(tasks[0].id);

// Retry failed upload
uploader.retryUpload(tasks[0].id);
```

## TypeScript

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  UploadProvider,
  UploadTask,
  UploadResult,
  UploadProgress,
  SignerFunction,
  MultipartSignerFunctions,
} from '@awesome-s3-uploader/core';
```

## License

MIT
