# @awesome-s3-uploader

Modern, framework-agnostic S3 file upload library with multipart support. Built to replace the abandoned `react-s3-uploader` package.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why @awesome-s3-uploader?

- **Framework-agnostic core** - Use with React, Vue, Svelte, or vanilla JS
- **Zero dependencies** - Core package has no runtime dependencies
- **TypeScript-first** - Full type safety and IntelliSense support
- **Multipart uploads** - Automatic chunking for large files
- **Mock mode** - Test without a backend
- **Retry logic** - Built-in exponential backoff
- **Progress tracking** - Real-time upload progress with speed and ETA
- **Validation** - File type, size, and image dimension validation
- **Headless** - Bring your own UI

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`@awesome-s3-uploader/core`](./packages/core) | Framework-agnostic upload engine | 0.1.0 |
| [`@awesome-s3-uploader/react`](./packages/react) | React hooks and components | 0.1.0 |

## Quick Start

### React

```bash
npm install @awesome-s3-uploader/react
```

```tsx
import { useUpload } from '@awesome-s3-uploader/react';

function UploadButton() {
  const { upload, status, progress, result } = useUpload({ 
    provider: 'mock' // Use mock mode for testing
  });

  return (
    <div>
      <button onClick={() => upload()}>Upload File</button>
      {status === 'uploading' && <p>Progress: {progress?.percent}%</p>}
      {status === 'success' && <p>Uploaded: {result?.url}</p>}
    </div>
  );
}
```

### Vanilla JS

```bash
npm install @awesome-s3-uploader/core
```

```javascript
import { createUploader } from '@awesome-s3-uploader/core';

const uploader = createUploader({ provider: 'mock' });

uploader.on('upload:progress', ({ progress }) => {
  console.log(`Progress: ${progress.percent}%`);
});

uploader.on('upload:success', ({ result }) => {
  console.log('Upload complete:', result.url);
});

uploader.addFiles(fileInput.files);
```

## Features

### Mock Mode

Test your upload UI without a backend:

```typescript
const uploader = createUploader({ 
  provider: 'mock' 
});
```

### Real S3 Uploads

Connect to your signing server:

```typescript
import { createUploader, createS3Provider } from '@awesome-s3-uploader/core';

const uploader = createUploader({
  provider: createS3Provider({
    signingUrl: '/api/s3/sign'
  })
});
```

### File Validation

```typescript
const uploader = createUploader({
  provider: 'mock',
  validation: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/*', 'application/pdf'],
    image: {
      maxWidth: 4000,
      maxHeight: 4000,
      aspectRatio: 16/9
    }
  }
});
```

### Multipart Uploads

Large files are automatically chunked:

```typescript
const uploader = createUploader({
  provider: createS3Provider({ signingUrl: '/api/s3/sign' }),
  multipartThreshold: 100 * 1024 * 1024, // 100MB
  chunkSize: 10 * 1024 * 1024, // 10MB chunks
  maxConcurrency: 4 // Upload 4 chunks in parallel
});
```

## Documentation

Full documentation available at [https://YOUR_ORG.github.io/@awesome-s3-uploader](https://YOUR_ORG.github.io/@awesome-s3-uploader)

## Examples

- [React Basic](./examples/react-basic) - Simple single-file upload
- [React Dropzone](./examples/react-dropzone) - Drag-and-drop multi-file
- [Next.js](./examples/nextjs) - Full-stack with API routes
- [Vanilla JS](./examples/vanilla-js) - No framework
- [Express Server](./examples/server/node-express) - Backend signing server

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run examples
cd examples/react-basic
pnpm dev
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT © @awesome-s3-uploader Contributors
