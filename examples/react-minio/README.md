# React + MinIO Example

Real S3/MinIO upload example using S3Up with Express signing server.

## Features

- Single file upload with `useUpload` hook
- Real S3/MinIO uploads using AWS SDK v3
- Express backend for pre-signed URL generation
- File validation (size and type)
- Real-time progress tracking
- Error handling
- Beautiful UI

## Prerequisites

1. **MinIO running** (from project root):
```bash
docker-compose up -d
```

2. **Express server running** (from project root):
```bash
cd examples/server/node-express
pnpm dev
```

## Running

```bash
pnpm install
pnpm dev
```

Open http://localhost:5174

## What's Demonstrated

- Using `useUpload` hook with real S3 provider
- `createS3Provider` for backend integration
- Pre-signed URL workflow
- Real file uploads to MinIO
- File validation configuration
- Progress tracking with actual uploads
- Success/error states

## Verify Uploads

Check uploaded files in MinIO console:
- URL: http://localhost:9001
- Login: minioadmin / minioadmin
- Bucket: test-bucket
