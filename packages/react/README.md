# @awesome-s3-uploader/react

React hooks for S3 file uploads with multipart support, progress tracking, and flexible authentication.

## Features

- ✅ **Simple Hook API** - `useUpload()` for single file, `useUploader()` for multiple
- ✅ **Multipart Uploads** - Automatic multipart for large files (opt-in)
- ✅ **Progress Tracking** - Real-time upload progress
- ✅ **File Validation** - Built-in validation with wildcard support
- ✅ **TypeScript** - Full type safety
- ✅ **Flexible Auth** - URL-based or custom signer functions
- ✅ **Auto Upload** - Upload on file selection or manual control

## Installation

```bash
npm install @awesome-s3-uploader/react @awesome-s3-uploader/core
# or
pnpm add @awesome-s3-uploader/react @awesome-s3-uploader/core
# or
yarn add @awesome-s3-uploader/react @awesome-s3-uploader/core
```

## Quick Start

### Mock Mode (No Server Required)

```tsx
import { useUpload } from '@awesome-s3-uploader/react';

function UploadButton() {
  const { upload, status, progress, result, inputRef } = useUpload({ 
    provider: 'mock' 
  });

  return (
    <div>
      <input ref={inputRef} type="file" style={{ display: 'none' }} />
      <button onClick={() => upload()}>Upload File</button>
      
      {status === 'uploading' && <p>Progress: {progress?.percent}%</p>}
      {status === 'success' && <p>Uploaded: {result?.url}</p>}
      {status === 'error' && <p>Error: {error?.message}</p>}
    </div>
  );
}
```

### Simple S3 Upload

```tsx
import { useUpload, createS3Provider } from '@awesome-s3-uploader/react';

function UploadButton() {
  const { upload, status, progress, result, inputRef } = useUpload({
    provider: createS3Provider({
      signingUrl: 'https://api.example.com/sign',
    }),
    validation: {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedTypes: ['image/*', 'application/pdf'],
    },
  });

  return (
    <div>
      <input ref={inputRef} type="file" style={{ display: 'none' }} />
      <button onClick={() => upload()}>
        {status === 'uploading' ? 'Uploading...' : 'Upload File'}
      </button>
      
      {progress && (
        <div>
          <progress value={progress.percent} max={100} />
          <span>{progress.percent}%</span>
        </div>
      )}
      
      {result && <p>Uploaded: {result.url}</p>}
    </div>
  );
}
```

## Multipart Uploads

Enable multipart uploads for large files by setting `multipartThreshold`:

```tsx
import { useUpload, createS3Provider } from '@awesome-s3-uploader/react';

function LargeFileUpload() {
  const { upload, status, progress, inputRef } = useUpload({
    provider: createS3Provider({
      signingUrl: 'https://api.example.com/sign',
      multipartUrl: 'https://api.example.com/multipart',
      multipartThreshold: 5 * 1024 * 1024, // 5MB
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
      maxConcurrency: 3, // Upload 3 parts in parallel
    }),
    validation: {
      maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
    },
  });

  return (
    <div>
      <input ref={inputRef} type="file" style={{ display: 'none' }} />
      <button onClick={() => upload()}>Upload Large File</button>
      
      {status === 'uploading' && (
        <div>
          <p>Uploading: {progress?.percent}%</p>
          <p>Speed: {(progress?.speed / 1024 / 1024).toFixed(2)} MB/s</p>
        </div>
      )}
    </div>
  );
}
```

## Authentication

### URL-based Signing

```tsx
const { upload } = useUpload({
  provider: createS3Provider({
    signingUrl: 'https://api.example.com/sign',
    signingMethod: 'POST',
    signingHeaders: {
      'Authorization': 'Bearer token',
    },
  }),
});
```

### Custom Signer with Dynamic Token

```tsx
import { useRef, useEffect } from 'react';

function ProtectedUpload({ authToken }) {
  const authTokenRef = useRef(authToken);
  
  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  const { upload, inputRef } = useUpload({
    provider: createS3Provider({
      signer: async (file, params) => {
        const response = await fetch('https://api.example.com/sign', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authTokenRef.current}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });
        return response.json();
      },
    }),
  });

  return (
    <>
      <input ref={inputRef} type="file" style={{ display: 'none' }} />
      <button onClick={() => upload()}>Upload</button>
    </>
  );
}
```

## Multiple File Uploads

Use `useUploader()` for managing multiple file uploads:

```tsx
import { useUploader, createS3Provider } from '@awesome-s3-uploader/react';

function MultiFileUpload() {
  const { addFiles, tasks, removeTask, retryTask, inputRef } = useUploader({
    provider: createS3Provider({
      signingUrl: '/api/sign',
    }),
  });

  return (
    <div>
      <input 
        ref={inputRef} 
        type="file" 
        multiple 
        style={{ display: 'none' }} 
      />
      <button onClick={() => addFiles()}>Add Files</button>

      <div>
        {tasks.map((task) => (
          <div key={task.id}>
            <p>{task.file.name}</p>
            <p>Status: {task.status}</p>
            {task.progress && <progress value={task.progress.percent} max={100} />}
            
            {task.status === 'error' && (
              <button onClick={() => retryTask(task.id)}>Retry</button>
            )}
            <button onClick={() => removeTask(task.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## API Reference

### `useUpload(config)`

Hook for single file uploads.

**Returns:**
```typescript
{
  upload: () => void;           // Trigger file picker
  status: UploadStatus;         // 'idle' | 'uploading' | 'success' | 'error'
  progress: UploadProgress | null;
  result: UploadResult | null;
  error: Error | null;
  reset: () => void;            // Reset to idle state
  inputRef: RefObject<HTMLInputElement>;
}
```

### `useUploader(config)`

Hook for multiple file uploads.

**Returns:**
```typescript
{
  addFiles: (files?: FileList | File[]) => void;
  tasks: UploadTask[];
  removeTask: (taskId: string) => void;
  retryTask: (taskId: string) => void;
  abortTask: (taskId: string) => void;
  inputRef: RefObject<HTMLInputElement>;
}
```

## Configuration

### Provider Config

```typescript
interface S3ProviderConfig {
  // Simple mode: URL-based signing
  signingUrl?: string;
  signingMethod?: 'GET' | 'POST';
  signingHeaders?: Record<string, string> | (() => Record<string, string>);
  
  // Advanced mode: Custom signer
  signer?: (file: File, params: SignedUrlParams) => Promise<SignedUrlResult>;
  
  // Multipart configuration (opt-in)
  multipartUrl?: string;
  multipartSigner?: MultipartSignerFunctions;
  multipartThreshold?: number; // Default: Infinity (disabled)
  chunkSize?: number; // Default: 10MB
  maxConcurrency?: number; // Default: 3
}
```

### Upload Config

```typescript
interface UploadConfig {
  provider: UploadProvider | 'mock';
  validation?: {
    maxFileSize?: number;
    allowedTypes?: string[]; // Supports wildcards: 'image/*', '*'
  };
  autoUpload?: boolean; // Default: true
}
```

## File Validation

### Wildcard Support

```tsx
const { upload } = useUpload({
  provider,
  validation: {
    allowedTypes: [
      'image/*',        // All images
      'video/*',        // All videos  
      'application/pdf', // Specific type
      '*',              // All types
    ],
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },
});
```

## Examples

### Drag and Drop

```tsx
function DragDropUpload() {
  const { upload, status, inputRef } = useUpload({
    provider: createS3Provider({
      signingUrl: '/api/sign',
    }),
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (inputRef.current && e.dataTransfer.files.length > 0) {
      inputRef.current.files = e.dataTransfer.files;
      upload();
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      style={{ border: '2px dashed #ccc', padding: '20px' }}
    >
      <input ref={inputRef} type="file" style={{ display: 'none' }} />
      <p>Drag files here or <button onClick={() => upload()}>browse</button></p>
      {status === 'uploading' && <p>Uploading...</p>}
    </div>
  );
}
```

### Image Preview

```tsx
function ImageUpload() {
  const [preview, setPreview] = useState<string | null>(null);
  const { upload, status, result, inputRef } = useUpload({
    provider: createS3Provider({
      signingUrl: '/api/sign',
    }),
    validation: {
      allowedTypes: ['image/*'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
    },
  });

  useEffect(() => {
    const input = inputRef.current;
    const handleChange = () => {
      const file = input?.files?.[0];
      if (file) {
        setPreview(URL.createObjectURL(file));
      }
    };
    input?.addEventListener('change', handleChange);
    return () => input?.removeEventListener('change', handleChange);
  }, [inputRef]);

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} />
      <button onClick={() => upload()}>Upload Image</button>
      
      {preview && <img src={preview} alt="Preview" style={{ maxWidth: '200px' }} />}
      {status === 'success' && <img src={result?.url} alt="Uploaded" />}
    </div>
  );
}
```

### Manual Upload Control

```tsx
function ManualUpload() {
  const { upload, status, progress, inputRef } = useUpload({
    provider: createS3Provider({
      signingUrl: '/api/sign',
    }),
    autoUpload: false, // Don't upload automatically
  });

  return (
    <div>
      <input ref={inputRef} type="file" style={{ display: 'none' }} />
      <button onClick={() => inputRef.current?.click()}>Select File</button>
      <button onClick={() => upload()} disabled={status === 'uploading'}>
        Start Upload
      </button>
      
      {progress && <p>{progress.percent}%</p>}
    </div>
  );
}
```

## TypeScript

Full TypeScript support:

```typescript
import type {
  UploadStatus,
  UploadProgress,
  UploadResult,
  UploadTask,
} from '@awesome-s3-uploader/react';
```

## License

MIT
