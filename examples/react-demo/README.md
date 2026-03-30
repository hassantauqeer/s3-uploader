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

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Open http://localhost:5173 in your browser

3. Use the mode selector to switch between modes:
   - **Mock**: No backend needed
   - **Public API**: Requires MinIO + unified server
   - **Protected API**: Requires MinIO + unified server + login

4. Select a file and click "Upload File" to test the upload

## Multipart Upload Testing

The uploader automatically uses multipart upload for files larger than 5MB:

1. **Small files (<5MB)**: Single PUT request
2. **Large files (>5MB)**: Multipart upload with 5MB chunks

To test multipart uploads:
```bash
# Create a test file larger than 5MB
dd if=/dev/zero of=test-10mb.bin bs=1m count=10

# Upload it in the React demo (Public or Protected mode)
# Watch the console for multipart upload logs
```

Features of multipart uploads:
- **Parallel chunks**: Faster uploads for large files
- **Resume support**: Can retry failed chunks
- **Progress tracking**: Per-chunk progress updates
- **Works with auth**: JWT tokens included in all multipart requests (Protected mode)

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
