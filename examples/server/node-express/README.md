# Express S3 Signing Server

Backend server that generates pre-signed URLs for S3/MinIO uploads using AWS SDK v3.

## Features

- Single file upload signing
- Multipart upload support (initiate, sign parts, complete, abort)
- Works with both AWS S3 and MinIO
- CORS enabled for local development
- Environment-based configuration

## Setup

1. **Copy environment file**
```bash
cp .env.example .env
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Start MinIO** (from project root)
```bash
docker-compose up -d
```

4. **Start the server**
```bash
pnpm dev
```

Server will run on http://localhost:3001

## Endpoints

### Single File Upload
- `GET /api/s3/sign?fileName=test.jpg&contentType=image/jpeg&path=uploads`

### Multipart Upload
- `POST /api/s3/multipart/initiate` - Start multipart upload
- `GET /api/s3/multipart/sign-part` - Get signed URL for a part
- `POST /api/s3/multipart/complete` - Complete multipart upload
- `POST /api/s3/multipart/abort` - Abort multipart upload

## Using with React Example

Update your React app to use the real S3 provider:

```tsx
import { createS3Provider } from '@awesome-s3-uploader/core';

const uploader = createUploader({
  provider: createS3Provider({
    signingUrl: 'http://localhost:3001/api/s3/sign',
    multipartUrl: 'http://localhost:3001/api/s3/multipart',
  }),
});
```

## Configuration

Edit `.env` to configure:
- MinIO/S3 endpoint
- Access credentials
- Bucket name
- Server port
