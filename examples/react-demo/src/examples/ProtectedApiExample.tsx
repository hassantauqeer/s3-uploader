import { useState, useRef, useEffect, useMemo } from 'react';
import { useUpload, createS3Provider } from '@awesome-s3-uploader/react';
import { UploadCard, InfoPanel } from '../components';

export function ProtectedApiExample() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const authTokenRef = useRef<string | null>(null);

  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  const protectedProvider = useMemo(() => {
    return createS3Provider({
      signer: async (_file, params) => {
        const token = authTokenRef.current;
        const response = await fetch('http://localhost:3001/api/auth/s3/sign', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
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
    });
  }, []);

  const { upload, status, progress, result, error, reset, inputRef } = useUpload({
    provider: protectedProvider,
    validation: {
      maxFileSize: 10 * 1024 * 1024 * 1024,
      allowedTypes: ['image/*', 'application/pdf', 'video/*', '*'],
    },
  });

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
    } catch {
      setLoginError('Login failed. Make sure the server is running on port 3001.');
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
  };

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
        disabled={!authToken}
        disabledText="Login Required"
      />
      <InfoPanel>
        <h3>Protected API (JWT Auth)</h3>
        {!authToken ? (
          <>
            <p style={{ marginBottom: '1rem' }}>Login required to upload files.</p>
            <button
              onClick={handleLogin}
              className="upload-button"
              style={{ fontSize: '0.9rem', padding: '0.75rem 2rem' }}
            >
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

export default ProtectedApiExample;
