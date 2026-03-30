# @awesome-s3-uploader/core

Framework-agnostic S3 file upload engine with multipart support.

## Installation

```bash
npm install @awesome-s3-uploader/core
# or
pnpm add @awesome-s3-uploader/core
# or
yarn add @awesome-s3-uploader/core
```

## Quick Start

```typescript
import { createUploader } from '@awesome-s3-uploader/core';

// Mock mode - works immediately, no server needed
const uploader = createUploader({ provider: 'mock' });

uploader.on('upload:success', ({ result }) => {
  console.log('Upload complete:', result.url);
});

const tasks = uploader.addFiles(fileInput.files);
```

## Documentation

Full documentation available at [https://YOUR_ORG.github.io/s3up](https://YOUR_ORG.github.io/s3up)

## License

MIT
