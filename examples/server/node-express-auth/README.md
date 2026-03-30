# Protected S3 Signing Server (JWT Auth)

Express server that generates S3 pre-signed URLs with JWT authentication. Demonstrates how to use the custom signer function with protected APIs.

## Features

- 🔒 JWT-based authentication
- 🔑 Token-based API access
- 👤 User-isolated file storage
- ✅ Single file uploads
- ✅ Multipart uploads for large files
- 🛡️ Secure endpoint protection

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

Server runs on `http://localhost:3002`

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Get JWT token for authentication.

**Request:**
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
  "user": {
    "id": 1,
    "username": "demo"
  }
}
```

### Protected Endpoints (Require `Authorization: Bearer <token>`)

#### POST `/api/s3/sign`
Get pre-signed URL for single file upload.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Request:**
```json
{
  "fileName": "example.jpg",
  "contentType": "image/jpeg",
  "fileSize": 1024000
}
```

#### POST `/api/s3/multipart/initiate`
Start multipart upload.

#### POST `/api/s3/multipart/sign-part`
Get signed URL for a part.

#### POST `/api/s3/multipart/complete`
Complete multipart upload.

#### POST `/api/s3/multipart/abort`
Abort multipart upload.

## Using with React Example

### With Custom Signer Function

```tsx
import { createS3Provider } from '@awesome-s3-uploader/react';

// Get token from your auth system
const getAuthToken = () => localStorage.getItem('authToken');

const provider = createS3Provider({
  signer: async (file, params) => {
    const token = getAuthToken();
    const response = await fetch('http://localhost:3002/api/s3/sign', {
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
    
    if (!response.ok) {
      throw new Error('Failed to get signed URL');
    }
    
    return response.json();
  },
  multipartSigner: {
    initiate: async (file, params) => {
      const token = getAuthToken();
      const response = await fetch('http://localhost:3002/api/s3/multipart/initiate', {
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
      const response = await fetch('http://localhost:3002/api/s3/multipart/sign-part', {
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
      const response = await fetch('http://localhost:3002/api/s3/multipart/complete', {
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
      await fetch('http://localhost:3002/api/s3/multipart/abort', {
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

## Security Notes

- Change `JWT_SECRET` in production
- Use HTTPS in production
- Implement proper user authentication
- Add rate limiting
- Validate file types and sizes
- Implement user quotas
- Add logging and monitoring

## File Organization

Files are automatically organized by user ID:
```
bucket/
└── users/
    └── {userId}/
        └── {fileName}
```

This ensures user isolation and prevents file conflicts.
