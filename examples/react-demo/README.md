# React Demo - S3 Uploader

Interactive demo showcasing both **Mock** and **MinIO** upload modes in a single React application.

## Features

### Mock Mode
- ✓ No backend required
- ✓ Instant testing and development
- ✓ Simulated upload progress
- ✓ File validation

### MinIO Mode
- ✓ Real S3-compatible uploads
- ✓ AWS SDK v3 pre-signed URLs
- ✓ Express signing server integration
- ✓ Actual file storage in MinIO

## Quick Start

### Mock Mode (No Setup Required)

```bash
cd examples/react-demo
pnpm install
pnpm dev
```

Open http://localhost:5173 and select **Mock Mode** - works immediately!

### MinIO Mode (Requires Backend)

1. **Start MinIO:**
```bash
docker-compose up -d
```

2. **Start Express signing server:**
```bash
cd examples/server/node-express
npm install
npm start
```

3. **Run the React app:**
```bash
cd examples/react-demo
pnpm dev
```

4. Open http://localhost:5173 and select **MinIO Mode**

## Usage

Switch between modes using the toggle buttons at the top. Each mode demonstrates:

- File selection and validation
- Real-time upload progress
- Success/error handling
- File type and size restrictions (10MB max, images & PDFs only)

## Code Example

```tsx
import { useUpload, createS3Provider } from '@awesome-s3-uploader/react';

// Mock mode
const mockUpload = useUpload({ provider: 'mock' });

// MinIO mode
const minioUpload = useUpload({
  provider: createS3Provider({
    signingUrl: 'http://localhost:3001/api/s3/sign',
    multipartUrl: 'http://localhost:3001/api/s3/multipart',
  }),
});
```

## Learn More

- [Core Package Documentation](../../packages/core/README.md)
- [React Package Documentation](../../packages/react/README.md)
- [Express Server Setup](../server/node-express/README.md)
