# Unified S3 Signing Server

Single Express server with both **public** (no auth) and **protected** (JWT auth) endpoints for S3 pre-signed URLs.

## Features

- 🌐 **Public API** - No authentication required (`/api/s3/*`)
- 🔒 **Protected API** - JWT authentication required (`/api/auth/s3/*`)
- ✅ Single file uploads
- ✅ Multipart uploads for large files
- 👤 User-isolated storage for protected endpoints
- 🔑 JWT token-based authentication

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Start MinIO (if not running):**
```bash
docker-compose up -d
```

4. **Start the server:**
```bash
npm start
```

Server runs on `http://localhost:3001`

## API Endpoints

### Public Endpoints (No Authentication)

#### GET `/api/s3/sign`
Get pre-signed URL for single file upload.

**Query Parameters:**
```
fileName: string
contentType: string
path?: string (optional)
```

**Response:**
```json
{
  "signedUrl": "https://...",
  "publicUrl": "http://localhost:9000/test-bucket/file.jpg",
  "key": "file.jpg",
  "headers": { "Content-Type": "image/jpeg" }
}
```

#### POST `/api/s3/multipart/initiate`
Start multipart upload.

#### GET `/api/s3/multipart/sign-part`
Get signed URL for a part.

#### POST `/api/s3/multipart/complete`
Complete multipart upload.

#### POST `/api/s3/multipart/abort`
Abort multipart upload.

---

### Authentication

#### POST `/api/auth/login`
Get JWT token for protected endpoints.

**Body:**
```json
{
  "username": "demo",
  "password": "demo123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "username": "demo" }
}
```

---

### Protected Endpoints (Require JWT)

All protected endpoints require `Authorization: Bearer <token>` header.

#### POST `/api/auth/s3/sign`
Get pre-signed URL with user isolation.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Body:**
```json
{
  "fileName": "example.jpg",
  "contentType": "image/jpeg",
  "fileSize": 1024000
}
```

Files are stored in `users/{userId}/` path automatically.

#### POST `/api/auth/s3/multipart/initiate`
Start multipart upload (protected).

#### POST `/api/auth/s3/multipart/sign-part`
Get signed URL for a part (protected).

#### POST `/api/auth/s3/multipart/complete`
Complete multipart upload (protected).

#### POST `/api/auth/s3/multipart/abort`
Abort multipart upload (protected).

## Usage with React

### Public API (Simple)

```tsx
import { createS3Provider } from '@awesome-s3-uploader/react';

const provider = createS3Provider({
  signingUrl: 'http://localhost:3001/api/s3/sign',
  multipartUrl: 'http://localhost:3001/api/s3/multipart',
});
```

### Protected API (Custom Signer)

```tsx
import { createS3Provider } from '@awesome-s3-uploader/react';

const getAuthToken = () => localStorage.getItem('authToken');

const provider = createS3Provider({
  signer: async (file, params) => {
    const token = getAuthToken();
    const response = await fetch('http://localhost:3001/api/auth/s3/sign', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: params.fileName,
        contentType: params.contentType,
        fileSize: params.fileSize,
      }),
    });
    return response.json();
  },
  multipartSigner: {
    initiate: async (file, params) => {
      const token = getAuthToken();
      const response = await fetch('http://localhost:3001/api/auth/s3/multipart/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: params.fileName,
          contentType: params.contentType,
          fileSize: params.fileSize,
        }),
      });
      return response.json();
    },
    signPart: async (file, params) => {
      const token = getAuthToken();
      const response = await fetch('http://localhost:3001/api/auth/s3/multipart/sign-part', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId: params.uploadId,
          key: params.key,
          partNumber: params.partNumber,
        }),
      });
      return response.json();
    },
    complete: async (file, params) => {
      const token = getAuthToken();
      const response = await fetch('http://localhost:3001/api/auth/s3/multipart/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId: params.uploadId,
          key: params.key,
          parts: params.parts,
        }),
      });
      return response.json();
    },
    abort: async (file, params) => {
      const token = getAuthToken();
      await fetch('http://localhost:3001/api/auth/s3/multipart/abort', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId: params.uploadId,
          key: params.key,
        }),
      });
    },
  },
});
```

## File Organization

**Public endpoints:**
```
bucket/
└── {fileName}
```

**Protected endpoints:**
```
bucket/
└── users/
    └── {userId}/
        └── {fileName}
```

## Security Notes

- Change `JWT_SECRET` in production
- Use HTTPS in production
- Implement proper user authentication
- Add rate limiting
- Validate file types and sizes
- Implement user quotas
- Add logging and monitoring

## Testing

```bash
# Test public endpoint
curl "http://localhost:3001/api/s3/sign?fileName=test.jpg&contentType=image/jpeg"

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo123"}'

# Test protected endpoint
curl -X POST http://localhost:3001/api/auth/s3/sign \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.jpg","contentType":"image/jpeg","fileSize":1024}'
```
