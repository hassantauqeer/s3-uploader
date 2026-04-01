import { useUpload, createS3Provider } from '@awesome-s3-uploader/react';
import { UploadCard, InfoPanel } from '../components';

export function PublicApiExample() {
  const { upload, status, progress, result, error, reset, inputRef } = useUpload({
    provider: createS3Provider({
      signingUrl: 'http://localhost:3001/api/s3/sign',
      multipartUrl: 'http://localhost:3001/api/s3/multipart',
      multipartThreshold: 5 * 1024 * 1024, // 5MB - files larger than this will use multipart upload
      chunkSize: 5 * 1024 * 1024, // 5MB - each chunk will be 5MB
    }),
    validation: {
      maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
      allowedTypes: ['*'],
      blockedTypes: ['video/mp4'], // takes precedence over allowedTypes
    },
    retry: {
      maxRetries: 2,
      initialDelay: 5000,
      maxDelay: 10000, // max delay between retries in ms
    },
    uniquePrefix: false, // don't add unique prefix to filename
    contentDisposition: 'attachment', // force download instead of inline display when clicking on the upladded file link
    path: 'custom-path', // adds a custom path to the uploaded files
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
        <h3>Public API (No Auth)</h3>
        <ul>
          <li>Real S3 uploads</li>
          <li>Simple URL-based signing</li>
          <li>No authentication needed</li>
          <li>Single PUT request</li>
        </ul>
        <p style={{ fontSize: '0.875rem', marginTop: '1rem', opacity: 0.8 }}>
          Best for files under 100MB. For larger files, use Multipart Upload mode.
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

export default PublicApiExample;
