import { useUpload } from '@awesome-s3-uploader/react';
import { UploadCard, InfoPanel } from '../components';

export function MockExample() {
  const { upload, status, progress, result, error, reset, inputRef } = useUpload({
    provider: 'mock',
    validation: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*', 'application/pdf'],
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
        <h3>Mock Mode</h3>
        <ul>
          <li>No backend required</li>
          <li>Instant testing</li>
          <li>Simulated upload progress</li>
          <li>File validation</li>
        </ul>
        <p style={{ fontSize: '0.875rem', marginTop: '1rem', opacity: 0.8 }}>
          Perfect for development and testing without infrastructure.
        </p>
      </InfoPanel>
    </>
  );
}

export default MockExample;
