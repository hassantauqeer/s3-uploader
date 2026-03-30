import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();
const PORT = process.env.PORT || 3002;

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// S3 Client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.S3_BUCKET || 'test-bucket';
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:9000';

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Login endpoint - generate JWT token
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  // Simple auth (in production, verify against database)
  if (username === 'demo' && password === 'demo123') {
    const user = { id: 1, username: 'demo' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      token,
      user: { id: user.id, username: user.username },
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Protected: Single file upload - Get signed URL
app.post('/api/s3/sign', authenticateToken, async (req, res) => {
  try {
    const { fileName, contentType, fileSize, path } = req.body;
    
    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    // Add user ID to path for isolation
    const userPath = `users/${req.user.id}`;
    const key = path ? `${userPath}/${path}/${fileName}` : `${userPath}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const publicUrl = `${PUBLIC_URL}/${BUCKET_NAME}/${key}`;

    res.json({
      signedUrl,
      publicUrl,
      key,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Protected: Multipart upload - Initiate
app.post('/api/s3/multipart/initiate', authenticateToken, async (req, res) => {
  try {
    const { fileName, contentType, fileSize, path } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    const userPath = `users/${req.user.id}`;
    const key = path ? `${userPath}/${path}/${fileName}` : `${userPath}/${fileName}`;

    const command = new CreateMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const response = await s3Client.send(command);

    res.json({
      uploadId: response.UploadId,
      key,
    });
  } catch (error) {
    console.error('Error initiating multipart upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Protected: Multipart upload - Sign part
app.post('/api/s3/multipart/sign-part', authenticateToken, async (req, res) => {
  try {
    const { uploadId, key, partNumber, contentLength } = req.body;

    if (!uploadId || !key || !partNumber) {
      return res.status(400).json({ error: 'uploadId, key, and partNumber are required' });
    }

    const command = new UploadPartCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({
      signedUrl,
      key,
    });
  } catch (error) {
    console.error('Error signing part:', error);
    res.status(500).json({ error: error.message });
  }
});

// Protected: Multipart upload - Complete
app.post('/api/s3/multipart/complete', authenticateToken, async (req, res) => {
  try {
    const { uploadId, key, parts } = req.body;

    if (!uploadId || !key || !parts) {
      return res.status(400).json({ error: 'uploadId, key, and parts are required' });
    }

    const command = new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((part) => ({
          ETag: part.etag,
          PartNumber: part.partNumber,
        })),
      },
    });

    const response = await s3Client.send(command);
    const publicUrl = `${PUBLIC_URL}/${BUCKET_NAME}/${key}`;

    res.json({
      publicUrl,
      key,
      etag: response.ETag,
    });
  } catch (error) {
    console.error('Error completing multipart upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Protected: Multipart upload - Abort
app.post('/api/s3/multipart/abort', authenticateToken, async (req, res) => {
  try {
    const { uploadId, key } = req.body;

    if (!uploadId || !key) {
      return res.status(400).json({ error: 'uploadId and key are required' });
    }

    const command = new AbortMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
    });

    await s3Client.send(command);

    res.json({ success: true });
  } catch (error) {
    console.error('Error aborting multipart upload:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔒 Protected S3 signing server running on http://localhost:${PORT}`);
  console.log(`   Login credentials: username=demo, password=demo123`);
});
