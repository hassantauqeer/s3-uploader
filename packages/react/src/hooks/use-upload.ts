import { useState, useRef, useCallback } from 'react';
import type {
  UploaderConfig,
  UploadProgress,
  UploadResult,
  UploadError,
  UploadStatus,
} from '@awesome-s3-uploader/core';
import { createUploader } from '@awesome-s3-uploader/core';

export interface UseUploadReturn {
  upload: (file?: File) => void;
  status: UploadStatus;
  progress: UploadProgress | null;
  result: UploadResult | null;
  error: UploadError | null;
  abort: () => void;
  reset: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function useUpload(config: UploaderConfig): UseUploadReturn {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<UploadError | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const uploaderRef = useRef(createUploader(config));
  const inputRef = useRef<HTMLInputElement>(null);

  const uploader = uploaderRef.current;

  const reset = useCallback(() => {
    if (currentTaskId) {
      uploader.remove(currentTaskId);
    }
    setStatus('idle');
    setProgress(null);
    setResult(null);
    setError(null);
    setCurrentTaskId(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [currentTaskId, uploader]);

  const abort = useCallback(() => {
    if (currentTaskId) {
      uploader.abort(currentTaskId);
    }
  }, [currentTaskId, uploader]);

  const upload = useCallback(
    (file?: File) => {
      if (file) {
        reset();
        const tasks = uploader.addFiles(file);
        const task = tasks[0];
        if (!task) return;

        setCurrentTaskId(task.id);

        const unsubscribers = [
          uploader.on('upload:start', ({ task: t }) => {
            if (t.id === task.id) setStatus(t.status);
          }),
          uploader.on('upload:progress', ({ task: t, progress: p }) => {
            if (t.id === task.id) {
              setStatus(t.status);
              setProgress(p);
            }
          }),
          uploader.on('upload:success', ({ task: t, result: r }) => {
            if (t.id === task.id) {
              setStatus(t.status);
              setResult(r);
              setProgress(null);
            }
          }),
          uploader.on('upload:error', ({ task: t, error: e }) => {
            if (t.id === task.id) {
              setStatus(t.status);
              setError(e);
              setProgress(null);
            }
          }),
          uploader.on('upload:abort', ({ task: t }) => {
            if (t.id === task.id) {
              setStatus(t.status);
              setProgress(null);
            }
          }),
        ];

        return () => unsubscribers.forEach((unsub) => unsub());
      } else {
        inputRef.current?.click();
      }
    },
    [uploader, reset]
  );

  return {
    upload,
    status,
    progress,
    result,
    error,
    abort,
    reset,
    inputRef,
  };
}
