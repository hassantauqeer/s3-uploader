# @s3up/core

Framework-agnostic S3 file upload engine with multipart support.

## Installation

```bash
npm install @s3up/core
# or
pnpm add @s3up/core
# or
yarn add @s3up/core
```

## Quick Start

```typescript
import { createUploader } from '@s3up/core';

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
