import { useState, useRef, useEffect, useMemo } from 'react';
import { useUpload, createS3Provider } from '@awesome-s3-uploader/react';
import './App.css';

type Mode = 'mock' | 'public' | 'protected';

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

  // Public API (no auth)
  const publicUpload = useUpload({
    provider: createS3Provider({
      signingUrl: 'http://localhost:3001/api/s3/sign',
      multipartUrl: 'http://localhost:3001/api/s3/multipart',
    }),
    validation: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*', 'application/pdf'],
    },
  });

  // Protected API (JWT auth with custom signer)
  // Signer functions use ref to get latest token value
  const protectedProvider = useMemo(() => {
    console.log('Creating protected provider');
    return createS3Provider({
      signer: async (_file, params) => {
        const token = authTokenRef.current;
        console.log('Signer called, token from ref:', token);
        console.log('authTokenRef:', authTokenRef);
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
      multipartSigner: {
        initiate: async (file, params) => {
          const token = authTokenRef.current;
          const response = await fetch('http://localhost:3001/api/auth/s3/multipart/initiate', {
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
          const token = authTokenRef.current;
          const response = await fetch('http://localhost:3001/api/auth/s3/multipart/sign-part', {
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
          const token = authTokenRef.current;
          const response = await fetch('http://localhost:3001/api/auth/s3/multipart/complete', {
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
          const token = authTokenRef.current;
          await fetch('http://localhost:3001/api/auth/s3/multipart/abort', {
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
  }, []);

  const protectedUpload = useUpload({
    provider: protectedProvider,
    validation: {
      maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
      allowedTypes: ['image/*', 'application/pdf', 'video/*', '*'],
    },
  });

  const { upload, status, progress, result, error, reset, inputRef } =
    mode === 'mock' ? mockUpload : mode === 'public' ? publicUpload : protectedUpload;

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
          Mock
        </button>
        <button
          className={`mode-button ${mode === 'public' ? 'active' : ''}`}
          onClick={() => setMode('public')}
        >
          Public API
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
                <li>Express server on port 3001</li>
              </ul>
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
                    <li>Custom signer functions</li>
                    <li>JWT token in headers</li>
                    <li>Files stored in users/{'{userId}'}/</li>
                    <li>Protected endpoints</li>
                  </ul>
                </>
              )}
              <h3 style={{ marginTop: '1.5rem' }}>Requirements</h3>
              <ul>
                <li>MinIO: <code>docker-compose up -d</code></li>
                <li>Server: <code>cd examples/server/node-express-unified && npm start</code></li>
              </ul>
              <p style={{ fontSize: '0.875rem', marginTop: '1rem', opacity: 0.8 }}>
                Same server, different endpoints!
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
