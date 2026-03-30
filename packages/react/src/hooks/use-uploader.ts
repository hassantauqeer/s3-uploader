import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  Uploader,
  UploaderConfig,
  UploadTask,
  UploadProgress,
} from '@ht/s3-uploader-core';
import { createUploader } from '@ht/s3-uploader-core';

export interface UseUploaderReturn {
  tasks: UploadTask[];
  addFiles: (files: File | File[] | FileList) => UploadTask[];
  upload: (taskId: string) => void;
  uploadAll: () => void;
  abort: (taskId: string) => void;
  abortAll: () => void;
  pause: (taskId: string) => void;
  resume: (taskId: string) => void;
  remove: (taskId: string) => void;
  clearCompleted: () => void;
  isUploading: boolean;
  totalProgress: UploadProgress | null;
  uploader: Uploader;
}

export function useUploader(config: UploaderConfig): UseUploaderReturn {
  const uploaderRef = useRef<Uploader | null>(null);
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  if (!uploaderRef.current) {
    uploaderRef.current = createUploader(config);
  }

  const uploader = uploaderRef.current;

  useEffect(() => {
    const unsubscribers = [
      uploader.on('file:added', () => {
        setTasks(uploader.getTasks());
      }),
      uploader.on('file:removed', () => {
        setTasks(uploader.getTasks());
      }),
      uploader.on('upload:start', () => {
        setTasks(uploader.getTasks());
      }),
      uploader.on('upload:progress', () => {
        setTasks(uploader.getTasks());
      }),
      uploader.on('upload:success', () => {
        setTasks(uploader.getTasks());
      }),
      uploader.on('upload:error', () => {
        setTasks(uploader.getTasks());
      }),
      uploader.on('upload:abort', () => {
        setTasks(uploader.getTasks());
      }),
    ];

    setTasks(uploader.getTasks());

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      uploader.destroy();
    };
  }, [uploader]);

  const addFiles = useCallback(
    (files: File | File[] | FileList) => {
      return uploader.addFiles(files);
    },
    [uploader]
  );

  const upload = useCallback((taskId: string) => uploader.upload(taskId), [uploader]);
  const uploadAll = useCallback(() => uploader.uploadAll(), [uploader]);
  const abort = useCallback((taskId: string) => uploader.abort(taskId), [uploader]);
  const abortAll = useCallback(() => uploader.abortAll(), [uploader]);
  const pause = useCallback((taskId: string) => uploader.pause(taskId), [uploader]);
  const resume = useCallback((taskId: string) => uploader.resume(taskId), [uploader]);
  const remove = useCallback((taskId: string) => uploader.remove(taskId), [uploader]);
  const clearCompleted = useCallback(() => uploader.clearCompleted(), [uploader]);

  const isUploading = useMemo(() => {
    return tasks.some((task) => ['validating', 'signing', 'uploading', 'completing'].includes(task.status));
  }, [tasks]);

  const totalProgress = useMemo(() => {
    const activeTasks = tasks.filter((task) => task.status === 'uploading' && task.progress);
    if (activeTasks.length === 0) return null;

    const totalLoaded = activeTasks.reduce((sum, task) => sum + (task.progress?.loaded ?? 0), 0);
    const totalSize = activeTasks.reduce((sum, task) => sum + (task.progress?.total ?? 0), 0);

    if (totalSize === 0) return null;

    return {
      loaded: totalLoaded,
      total: totalSize,
      percent: Math.round((totalLoaded / totalSize) * 100),
      speed: 0,
      estimatedTimeRemaining: 0,
    };
  }, [tasks]);

  return {
    tasks,
    addFiles,
    upload,
    uploadAll,
    abort,
    abortAll,
    pause,
    resume,
    remove,
    clearCompleted,
    isUploading,
    totalProgress,
    uploader,
  };
}
