import type { UploadTask, UploadStatus, UploadProgress, UploadResult, UploadError } from './types';
import { generateUniqueId } from './utils/unique-id';

export function createUploadTask(file: File, metadata?: Record<string, string>): UploadTask {
  return {
    id: generateUniqueId(),
    file,
    status: 'idle',
    progress: null,
    result: null,
    error: null,
    metadata,
  };
}

export function updateTaskStatus(task: UploadTask, status: UploadStatus): UploadTask {
  return { ...task, status };
}

export function updateTaskProgress(task: UploadTask, progress: UploadProgress): UploadTask {
  return { ...task, progress, status: 'uploading' };
}

export function updateTaskResult(task: UploadTask, result: UploadResult): UploadTask {
  return { ...task, result, status: 'success', progress: null };
}

export function updateTaskError(task: UploadTask, error: UploadError): UploadTask {
  return { ...task, error, status: 'error', progress: null };
}

export function isTaskActive(task: UploadTask): boolean {
  return ['validating', 'signing', 'uploading', 'completing'].includes(task.status);
}

export function isTaskComplete(task: UploadTask): boolean {
  return ['success', 'error', 'aborted'].includes(task.status);
}

export function isTaskPending(task: UploadTask): boolean {
  return task.status === 'idle';
}
