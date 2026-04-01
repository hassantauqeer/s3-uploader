import { useUpload, createS3Provider } from '@awesome-s3-uploader/react';
import { UploadCard, InfoPanel } from '../components';

export function MultipartExample() {
  const { upload, status, progress, result, error, reset, inputRef } = useUpload({
    provider: createS3Provider({
      signingUrl: 'http://localhost:3001/api/s3/sign',
      multipartSigner: {
        initiate: async (_file, params) => {
          const response = await fetch('http://localhost:3001/api/s3/multipart/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: params.fileName,
              contentType: params.contentType,
              fileSize: params.fileSize,
            }),
          });
          return response.json();
        },
        signPart: async (_file, params) => {
          const response = await fetch('http://localhost:3001/api/s3/multipart/sign-part', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uploadId: params.uploadId,
              key: params.key,
              partNumber: params.partNumber,
            }),
          });
          return response.json();
        },
        complete: async (_file, params) => {
          const response = await fetch('http://localhost:3001/api/s3/multipart/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uploadId: params.uploadId,
              key: params.key,
              parts: params.parts,
            }),
          });
          return response.json();
        },
        abort: async (_file, params) => {
          await fetch('http://localhost:3001/api/s3/multipart/abort', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uploadId: params.uploadId,
              key: params.key,
            }),
          });
        },
      },
      multipartThreshold: 5 * 1024 * 1024, // 5MB - files larger than this will use multipart upload
      chunkSize: 5 * 1024 * 1024, // 5MB - each chunk will be 5MB
      maxConcurrency: 5, // maximum number of concurrent uploads
    }),
    validation: {
      maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
      allowedTypes: ['*'],
    },
  });

  return (
    <>
      <UploadCard
        inputRef={inputRef}
        onFileSelect={(file) => upload(file)}
        onChooseFile={() => upload()}
        onReset={reset}
        status={status}
        progress={progress}
        result={result}
        error={error}
      />
      <InfoPanel>
        <h3>Multipart Upload (No Auth)</h3>
        <ul>
          <li>Automatic for files &gt;5MB</li>
          <li>Split into 5MB chunks</li>
          <li>Parallel upload for speed</li>
          <li>Resume on failure</li>
        </ul>
        <h3 style={{ marginTop: '1.5rem' }}>How It Works</h3>
        <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Multipart upload process:</p>
        <ol style={{ fontSize: '0.875rem', paddingLeft: '1.25rem' }}>
          <li>
            <strong>Initiate:</strong> POST /api/s3/multipart/initiate
          </li>
          <li>
            <strong>Upload Parts:</strong> POST /api/s3/multipart/sign-part (per chunk)
          </li>
          <li>
            <strong>Complete:</strong> POST /api/s3/multipart/complete
          </li>
        </ol>
        <p style={{ fontSize: '0.875rem', marginTop: '1rem', opacity: 0.8 }}>
          Upload a file &gt;5MB to see multipart in action! Check browser console for logs.
        </p>
        <h3 style={{ marginTop: '1.5rem' }}>Requirements</h3>
        <ul>
          <li>
            MinIO: <code>docker-compose up -d</code>
          </li>
          <li>
            Server: <code>cd examples/server/node-express-unified && npm start</code>
          </li>
        </ul>
      </InfoPanel>
    </>
  );
}

export default MultipartExample;
