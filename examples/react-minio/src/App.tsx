import { useUpload, createS3Provider } from '@s3up/react';
import './App.css';

function App() {
  const { upload, status, progress, result, error, reset, inputRef } = useUpload({
    provider: createS3Provider({
      signingUrl: 'http://localhost:3001/api/s3/sign',
      multipartUrl: 'http://localhost:3001/api/s3/multipart',
    }),
    validation: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*', 'application/pdf'],
    },
  });

  return (
    <div className="app">
      <header>
        <h1>S3Up React + MinIO Example</h1>
        <p>Real file upload to MinIO with Express signing server</p>
      </header>

      <main>
        <div className="upload-card">
          <input
            ref={inputRef}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
            style={{ display: 'none' }}
          />

          {status === 'idle' && (
            <button onClick={() => upload()} className="upload-button">
              Choose File
            </button>
          )}

          {status === 'validating' && (
            <div className="status">Validating file...</div>
          )}

          {status === 'signing' && (
            <div className="status">Getting upload URL...</div>
          )}

          {status === 'uploading' && progress && (
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="progress-text">{progress.percent}%</div>
            </div>
          )}

          {status === 'success' && result && (
            <div className="success">
              <h3>✓ Upload Complete!</h3>
              <p className="result-url">{result.url}</p>
              <button onClick={reset} className="reset-button">
                Upload Another
              </button>
            </div>
          )}

          {status === 'error' && error && (
            <div className="error">
              <h3>✗ Upload Failed</h3>
              <p>{error.message}</p>
              <button onClick={reset} className="reset-button">
                Try Again
              </button>
            </div>
          )}
        </div>

        <div className="info">
          <h3>Features</h3>
          <ul>
            <li>Real S3/MinIO uploads with Express backend</li>
            <li>AWS SDK v3 pre-signed URLs</li>
            <li>File validation (10MB max, images & PDFs only)</li>
            <li>Real-time progress tracking</li>
            <li>Error handling</li>
          </ul>
          <h3 style={{ marginTop: '1.5rem' }}>Requirements</h3>
          <ul>
            <li>MinIO running on port 9000</li>
            <li>Express server running on port 3001</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
