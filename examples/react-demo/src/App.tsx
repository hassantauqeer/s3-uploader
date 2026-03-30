import { useState, useRef, useEffect, useMemo } from 'react';
import { useUpload, createS3Provider } from '@awesome-s3-uploader/react';
import './App.css';

type Mode = 'mock' | 'public' | 'multipart' | 'protected';

function App() {
  const [mode, setMode] = useState<Mode>('mock');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const authTokenRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  const mockUpload = useUpload({
    provider: 'mock',
    validation: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*', 'application/pdf'],
    },
  });

  // Public API (no auth) - Single upload
  const publicUpload = useUpload({
    provider: createS3Provider({
      signingUrl: 'http://localhost:3001/api/s3/sign',
      multipartUrl: 'http://localhost:3001/api/s3/multipart',
      multipartThreshold: 5 * 1024 * 1024, // 5MB - triggers multipart easily
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
    }),
    validation: {
      maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
      allowedTypes: ['*'],
    },
  });

  // Public API (no auth) - Multipart upload example with custom signers
  const publicMultipartUpload = useUpload({
    provider: createS3Provider({
      // Single upload fallback
      signingUrl: 'http://localhost:3001/api/s3/sign',
      // Custom multipart signers
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
      multipartThreshold: 5 * 1024 * 1024, // 5MB - triggers multipart easily
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
    }),
    validation: {
      maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
      allowedTypes: ['image/*'],
    },
  });

  // Protected API (JWT auth with custom signer - single upload only)
  // Signer function uses ref to get latest token value
  const protectedProvider = useMemo(() => {
    return createS3Provider({
      signer: async (_file, params) => {
        const token = authTokenRef.current;
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
        
        if (!response.ok) {
          throw new Error('Failed to get signed URL');
        }
        
        return response.json();
      },
      // No multipart support for protected uploads
      multipartThreshold: Number.MAX_SAFE_INTEGER, // Disable multipart
    });
  }, []);

  const protectedUpload = useUpload({
    provider: protectedProvider,
    validation: {
      maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
      allowedTypes: ['image/*', 'application/pdf', 'video/*', '*'],
    },
  });

  const { upload, status, progress, result, error, reset, inputRef } =
    mode === 'mock' ? mockUpload 
    : mode === 'public' ? publicUpload 
    : mode === 'multipart' ? publicMultipartUpload 
    : protectedUpload;

  const handleLogin = async () => {
    try {
      setLoginError(null);
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'demo123' }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      setAuthToken(data.token);
    } catch (err) {
      setLoginError('Login failed. Make sure the server is running on port 3001.');
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
  };

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
          className={`mode-button ${mode === 'public' ? 'active' : ''}`}
          onClick={() => setMode('public')}
        >
          Public API
        </button>
        <button
          className={`mode-button ${mode === 'multipart' ? 'active' : ''}`}
          onClick={() => setMode('multipart')}
        >
          Multipart Upload
        </button>
        <button
          className={`mode-button ${mode === 'protected' ? 'active' : ''}`}
          onClick={() => setMode('protected')}
        >
          Protected API
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
            <button 
              onClick={() => upload()} 
              className="upload-button"
              disabled={mode === 'protected' && !authToken}
            >
              {mode === 'protected' && !authToken ? 'Login Required' : 'Choose File'}
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
          {mode === 'mock' && (
            <>
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
            </>
          )}
          
          {mode === 'public' && (
            <>
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
                <li>MinIO: <code>docker-compose up -d</code></li>
                <li>Server: <code>cd examples/server/node-express-unified && npm start</code></li>
              </ul>
            </>
          )}
          
          {mode === 'multipart' && (
            <>
              <h3>Multipart Upload (No Auth)</h3>
              <ul>
                <li>Automatic for files &gt;5MB</li>
                <li>Split into 5MB chunks</li>
                <li>Parallel upload for speed</li>
                <li>Resume on failure</li>
              </ul>
              <h3 style={{ marginTop: '1.5rem' }}>How It Works</h3>
              <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Multipart upload process:
              </p>
              <ol style={{ fontSize: '0.875rem', paddingLeft: '1.25rem' }}>
                <li><strong>Initiate:</strong> POST /api/s3/multipart/initiate</li>
                <li><strong>Upload Parts:</strong> POST /api/s3/multipart/sign-part (per chunk)</li>
                <li><strong>Complete:</strong> POST /api/s3/multipart/complete</li>
              </ol>
              <p style={{ fontSize: '0.875rem', marginTop: '1rem', opacity: 0.8 }}>
                Upload a file &gt;5MB to see multipart in action! Check browser console for logs.
              </p>
              <h3 style={{ marginTop: '1.5rem' }}>Requirements</h3>
              <ul>
                <li>MinIO: <code>docker-compose up -d</code></li>
                <li>Server: <code>cd examples/server/node-express-unified && npm start</code></li>
              </ul>
            </>
          )}
          
          {mode === 'protected' && (
            <>
              <h3>Protected API (JWT Auth)</h3>
              {!authToken ? (
                <>
                  <p style={{ marginBottom: '1rem' }}>Login required to upload files.</p>
                  <button onClick={handleLogin} className="upload-button" style={{ fontSize: '0.9rem', padding: '0.75rem 2rem' }}>
                    Login (demo/demo123)
                  </button>
                  {loginError && (
                    <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      {loginError}
                    </p>
                  )}
                  <ul style={{ marginTop: '1.5rem' }}>
                    <li>Custom signer functions</li>
                    <li>JWT token authentication</li>
                    <li>User-isolated storage</li>
                    <li>Secure API endpoints</li>
                  </ul>
                </>
              ) : (
                <>
                  <p style={{ color: '#10b981', marginBottom: '1rem' }}>✓ Authenticated as demo</p>
                  <button onClick={handleLogout} className="reset-button" style={{ fontSize: '0.9rem' }}>
                    Logout
                  </button>
                  <ul style={{ marginTop: '1.5rem' }}>
                    <li>Real S3 uploads</li>
                    <li>Custom signer function</li>
                    <li>JWT token in headers</li>
                    <li>Files stored in users/{'{userId}'}/</li>
                    <li>Single upload only (no multipart)</li>
                  </ul>
                  <p style={{ fontSize: '0.875rem', marginTop: '1rem', opacity: 0.8 }}>
                    For multipart uploads with auth, see the Multipart Upload mode and extend it with JWT.
                  </p>
                </>
              )}
              <h3 style={{ marginTop: '1.5rem' }}>Requirements</h3>
              <ul>
                <li>MinIO: <code>docker-compose up -d</code></li>
                <li>Server: <code>cd examples/server/node-express-unified && npm start</code></li>
              </ul>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
