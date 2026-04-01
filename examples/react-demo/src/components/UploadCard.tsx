import type {
  UploadStatus,
  UploadProgress,
  UploadResult,
  UploadError,
} from '@awesome-s3-uploader/react';

export interface UploadCardProps {
  inputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (file: File) => void;
  onChooseFile: () => void;
  onReset: () => void;
  status: UploadStatus;
  progress: UploadProgress | null;
  result: UploadResult | null;
  error: UploadError | null;
  disabled?: boolean;
  disabledText?: string;
}

export function UploadCard({
  inputRef,
  onFileSelect,
  onChooseFile,
  onReset,
  status,
  progress,
  result,
  error,
  disabled = false,
  disabledText = 'Choose File',
}: UploadCardProps) {
  return (
    <div className="upload-card">
      <input
        ref={inputRef}
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
        style={{ display: 'none' }}
      />

      {status === 'idle' && (
        <button onClick={onChooseFile} className="upload-button" disabled={disabled}>
          {disabled ? disabledText : 'Choose File'}
        </button>
      )}

      {status === 'validating' && <div className="status">Validating file...</div>}

      {status === 'signing' && <div className="status">Getting upload URL...</div>}

      {status === 'uploading' && progress && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="progress-text">{progress.percent}%</div>
        </div>
      )}

      {status === 'success' && result && (
        <div className="success">
          <h3>✓ Upload Complete!</h3>
          <p className="result-url">{result.url}</p>
          <button onClick={onReset} className="reset-button">
            Upload Another
          </button>
        </div>
      )}

      {status === 'error' && error && (
        <div className="error">
          <h3>✗ Upload Failed</h3>
          <p>{error.message}</p>
          <button onClick={onReset} className="reset-button">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export default UploadCard;
