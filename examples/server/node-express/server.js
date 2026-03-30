import express from 'express';
import cors from 'cors';
import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configure S3 client for MinIO
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
  },
  forcePathStyle: true, // Required for MinIO
});

const BUCKET_NAME = process.env.S3_BUCKET || 'test-bucket';
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:9000';

// Single file upload - Get signed URL
app.get('/api/s3/sign', async (req, res) => {
  try {
    const { fileName, contentType, path } = req.query;
    
    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    const key = path ? `${path}/${fileName}` : fileName;

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

// Multipart upload - Initiate
app.post('/api/s3/multipart/initiate', async (req, res) => {
  try {
    const { fileName, contentType, path } = req.body;
    
    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    const key = path ? `${path}/${fileName}` : fileName;

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

// Multipart upload - Get signed URL for part
app.get('/api/s3/multipart/sign-part', async (req, res) => {
  try {
    const { uploadId, key, partNumber } = req.query;
    
    if (!uploadId || !key || !partNumber) {
      return res.status(400).json({ error: 'uploadId, key, and partNumber are required' });
    }

    const command = new UploadPartCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: parseInt(partNumber),
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({
      signedUrl,
      key,
    });
  } catch (error) {
    console.error('Error generating part signed URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Multipart upload - Complete
app.post('/api/s3/multipart/complete', async (req, res) => {
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
        Parts: parts.map(part => ({
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

// Multipart upload - Abort
app.post('/api/s3/multipart/abort', async (req, res) => {
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`S3 signing server running on http://localhost:${PORT}`);
  console.log(`MinIO endpoint: ${process.env.S3_ENDPOINT || 'http://localhost:9000'}`);
  console.log(`Bucket: ${BUCKET_NAME}`);
});
