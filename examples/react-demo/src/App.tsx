import { useState } from 'react';
import { useUpload, createS3Provider } from '@awesome-s3-uploader/react';
import './App.css';

type Mode = 'mock' | 'minio';

function App() {
  const [mode, setMode] = useState<Mode>('mock');

  const mockUpload = useUpload({
    provider: 'mock',
    validation: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*', 'application/pdf'],
    },
  });

  const minioUpload = useUpload({
    provider: createS3Provider({
      signingUrl: 'http://localhost:3001/api/s3/sign',
      multipartUrl: 'http://localhost:3001/api/s3/multipart',
    }),
    validation: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*', 'application/pdf'],
    },
  });

  const { upload, status, progress, result, error, reset, inputRef } =
    mode === 'mock' ? mockUpload : minioUpload;

  return (
    <div className="app">
      <header>
        <h1>S3 Uploader React Demo</h1>
        <p>File upload examples with mock and real S3/MinIO providers</p>
      </header>

      <div className="mode-selector">
        <button
          className={`mode-button ${mode === 'mock' ? 'active' : ''}`}
          onClick={() => setMode('mock')}
        >
          Mock Mode
        </button>
        <button
          className={`mode-button ${mode === 'minio' ? 'active' : ''}`}
          onClick={() => setMode('minio')}
        >
          MinIO Mode
        </button>
      </div>

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
          {mode === 'mock' ? (
            <>
              <h3>Mock Mode Features</h3>
              <ul>
                <li>✓ No backend required</li>
                <li>✓ Instant testing</li>
                <li>✓ Simulated upload progress</li>
                <li>✓ File validation (10MB max, images & PDFs)</li>
                <li>✓ Error handling</li>
              </ul>
            </>
          ) : (
            <>
              <h3>MinIO Mode Features</h3>
              <ul>
                <li>✓ Real S3-compatible uploads</li>
                <li>✓ AWS SDK v3 pre-signed URLs</li>
                <li>✓ Express signing server</li>
                <li>✓ File validation (10MB max, images & PDFs)</li>
                <li>✓ Real-time progress tracking</li>
              </ul>
              <h3 style={{ marginTop: '1.5rem' }}>Requirements</h3>
              <ul>
                <li>MinIO running on port 9000</li>
                <li>Express server running on port 3001</li>
              </ul>
              <p style={{ fontSize: '0.875rem', marginTop: '1rem', opacity: 0.8 }}>
                Run: <code>docker-compose up -d</code> and <code>cd examples/server/node-express && npm start</code>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
