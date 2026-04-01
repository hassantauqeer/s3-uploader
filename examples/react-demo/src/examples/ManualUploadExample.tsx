import { useUploader, createS3Provider } from '@awesome-s3-uploader/react';
import type { UploadTask } from '@awesome-s3-uploader/react';
import { InfoPanel } from '../components';

/**
 * Example demonstrating autoUpload: false
 *
 * When autoUpload is false, files are added to the queue but not uploaded automatically.
 * The user can preview files, remove unwanted ones, and manually trigger uploads.
 */
export function ManualUploadExample() {
  const { tasks, addFiles, upload, uploadAll, remove, abort, clearCompleted, isUploading } =
    useUploader({
      provider: createS3Provider({
        signingUrl: 'http://localhost:3001/api/s3/sign',
        multipartUrl: 'http://localhost:3001/api/s3/multipart',
        multipartThreshold: 5 * 1024 * 1024, // 5MB - files larger than this will use multipart upload
        chunkSize: 5 * 1024 * 1024, // 5MB - each chunk will be 5MB
      }),
      validation: {
        maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
        allowedTypes: ['*'],
      },
      autoUpload: false, // this requires manual upload triggering
    });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
    e.target.value = '';
  };

  const pendingTasks = tasks.filter((t) => t.status === 'idle');
  const activeTasks = tasks.filter((t) =>
    ['validating', 'signing', 'uploading', 'completing'].includes(t.status)
  );
  const completedTasks = tasks.filter((t) => ['success', 'error', 'aborted'].includes(t.status));

  return (
    <>
      <div className="upload-card">
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          id="manual-file-input"
          style={{ display: 'none' }}
        />

        <div className="manual-upload-actions">
          <label htmlFor="manual-file-input" className="upload-button">
            Select Files
          </label>

          {pendingTasks.length > 0 && (
            <button
              onClick={uploadAll}
              className="upload-button"
              disabled={isUploading}
              style={{ marginLeft: '0.5rem' }}
            >
              Upload All ({pendingTasks.length})
            </button>
          )}

          {completedTasks.length > 0 && (
            <button
              onClick={clearCompleted}
              className="reset-button"
              style={{ marginLeft: '0.5rem' }}
            >
              Clear Completed
            </button>
          )}
        </div>

        {/* Pending Files */}
        {pendingTasks.length > 0 && (
          <div className="task-section">
            <h4>Pending Files</h4>
            <ul className="task-list">
              {pendingTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpload={() => upload(task.id)}
                  onRemove={() => remove(task.id)}
                />
              ))}
            </ul>
          </div>
        )}

        {/* Active Uploads */}
        {activeTasks.length > 0 && (
          <div className="task-section">
            <h4>Uploading</h4>
            <ul className="task-list">
              {activeTasks.map((task) => (
                <TaskItem key={task.id} task={task} onAbort={() => abort(task.id)} />
              ))}
            </ul>
          </div>
        )}

        {/* Completed */}
        {completedTasks.length > 0 && (
          <div className="task-section">
            <h4 className="completed">Completed</h4>
            <ul className="task-list">
              {completedTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </ul>
          </div>
        )}

        {tasks.length === 0 && (
          <p style={{ marginTop: '1rem', opacity: 0.7 }}>
            No files selected. Choose files to see them queued.
          </p>
        )}
      </div>

      <InfoPanel>
        <h3>Manual Upload Mode</h3>
        <p style={{ marginBottom: '1rem' }}>
          With <code>autoUpload: false</code>, files are queued but not uploaded until you
          explicitly trigger the upload.
        </p>
        <ul>
          <li>Preview files before uploading</li>
          <li>Remove unwanted files from queue</li>
          <li>Upload individually or all at once</li>
          <li>Cancel uploads in progress</li>
        </ul>
        <h3 style={{ marginTop: '1.5rem' }}>How It Works</h3>
        <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Manual upload process:</p>
        <ol style={{ fontSize: '0.875rem', paddingLeft: '1.25rem' }}>
          <li>
            <strong>Initiate:</strong> <code>POST /api/s3/multipart/initiate</code> will be
            triggered by clicking on Upload button
          </li>
          <li>
            <strong>Upload Parts:</strong> <code>POST /api/s3/multipart/sign-part</code> (per chunk)
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

interface TaskItemProps {
  task: UploadTask;
  onUpload?: () => void;
  onRemove?: () => void;
  onAbort?: () => void;
}

function TaskItem({ task, onUpload, onRemove, onAbort }: TaskItemProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <li
      className="task-item"
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}
    >
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {task.file.name}
      </span>
      <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{formatSize(task.file.size)}</span>
      <span
        style={{
          fontSize: '0.75rem',
          padding: '0.125rem 0.5rem',
          borderRadius: '4px',
          background:
            task.status === 'success'
              ? '#10b981'
              : task.status === 'error'
                ? '#ef4444'
                : task.status === 'uploading'
                  ? '#3b82f6'
                  : '#6b7280',
          color: 'white',
        }}
      >
        {task.status}
      </span>

      {task.status === 'uploading' && task.progress && (
        <span style={{ fontSize: '0.75rem' }}>{task.progress.percent}%</span>
      )}

      {task.status === 'idle' && (
        <>
          <button
            onClick={onUpload}
            className="action-button"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          >
            Upload
          </button>
          <button
            onClick={onRemove}
            className="action-button"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#ef4444' }}
          >
            Remove
          </button>
        </>
      )}

      {['validating', 'signing', 'uploading'].includes(task.status) && (
        <button
          onClick={onAbort}
          className="action-button"
          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#ef4444' }}
        >
          Cancel
        </button>
      )}
    </li>
  );
}

export default ManualUploadExample;
