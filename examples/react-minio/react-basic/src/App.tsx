import { useUpload } from '@s3up/react';
import './App.css';

function App() {
  const { upload, status, progress, result, error, reset, inputRef } = useUpload({
    provider: 'mock',
    validation: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*', 'application/pdf'],
    },
  });

  return (
    <div className="app">
      <header>
        <h1>S3Up React Example</h1>
        <p>Simple file upload with mock provider</p>
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
            <li>Mock provider (no backend required)</li>
            <li>File validation (10MB max, images & PDFs only)</li>
            <li>Real-time progress tracking</li>
            <li>Error handling</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
