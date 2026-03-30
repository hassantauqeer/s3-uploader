import type {
  UploaderConfig,
  UploadProvider,
  UploadTask,
  UploaderEventMap,
  UploadProgress,
  UploadResult,
} from './types';
import { UploadError } from './types';
import { TypedEventEmitter } from './utils/event-emitter';
import { validateFile } from './validators/file-validator';
import { createAbortController, isAbortError } from './utils/abort-controller';
import { withRetry, getRetryConfig } from './retry/exponential-backoff';
import { scrubFilename, addUniquePrefix } from './utils/filename';
import { getContentType } from './utils/content-type';
import {
  createUploadTask,
  updateTaskStatus,
  updateTaskProgress,
  updateTaskResult,
  updateTaskError,
  isTaskActive,
  isTaskComplete,
  isTaskPending,
} from './upload-task';
import { createMockProvider } from './providers/mock-provider';

export class UploadManager {
  private tasks: Map<string, UploadTask> = new Map();
  private emitter: TypedEventEmitter<UploaderEventMap>;
  private provider: UploadProvider;
  private config: Required<UploaderConfig>;
  private abortControllers: Map<string, AbortController> = new Map();
  private activeUploads = 0;

  constructor(config: UploaderConfig) {
    this.emitter = new TypedEventEmitter();
    this.provider = config.provider === 'mock' ? createMockProvider() : config.provider;
    
    this.config = {
      provider: this.provider,
      signingUrl: config.signingUrl ?? '',
      signingMethod: config.signingMethod ?? 'GET',
      signingHeaders: config.signingHeaders ?? {},
      signingParams: config.signingParams ?? {},
      signingWithCredentials: config.signingWithCredentials ?? false,
      // Use provider config if available, otherwise use config or defaults
      multipartThreshold: this.provider.multipartThreshold ?? config.multipartThreshold ?? 100 * 1024 * 1024,
      chunkSize: this.provider.chunkSize ?? config.chunkSize ?? 10 * 1024 * 1024,
      maxConcurrency: this.provider.maxConcurrency ?? config.maxConcurrency ?? 4,
      retry: getRetryConfig(config.retry),
      validation: config.validation ?? {},
      autoUpload: config.autoUpload ?? true,
      scrubFilename: config.scrubFilename ?? scrubFilename,
      uniquePrefix: config.uniquePrefix ?? true,
      contentDisposition: config.contentDisposition ?? 'auto',
      path: config.path ?? '',
      uploadHeaders: config.uploadHeaders ?? {},
      metadata: config.metadata ?? {},
    };
  }

  addFiles(files: File | File[] | FileList): UploadTask[] {
    const fileArray = Array.isArray(files) 
      ? files 
      : files instanceof File 
        ? [files] 
        : Array.from(files);
    const tasks: UploadTask[] = [];

    for (const file of fileArray) {
      const task = createUploadTask(file, this.config.metadata);
      this.tasks.set(task.id, task);
      tasks.push(task);
      this.emitter.emit('file:added', { task });

      if (this.config.autoUpload) {
        this.startUpload(task.id);
      }
    }

    return tasks;
  }

  async startUpload(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || !isTaskPending(task)) {
      return;
    }

    while (this.activeUploads >= this.config.maxConcurrency) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.activeUploads++;

    try {
      await this.executeUpload(taskId);
    } finally {
      this.activeUploads--;
      this.checkQueueComplete();
    }
  }

  private async executeUpload(taskId: string): Promise<void> {
    let task = this.tasks.get(taskId);
    if (!task) return;

    try {
      task = updateTaskStatus(task, 'validating');
      this.tasks.set(taskId, task);

      const validationResult = await validateFile(task.file, this.config.validation);
      if (!validationResult.valid) {
        task = updateTaskError(
          task,
          new UploadError(
            `Validation failed: ${validationResult.errors.join(', ')}`,
            'VALIDATION_ERROR',
            { taskId, retryable: false }
          )
        );
        this.tasks.set(taskId, task);
        this.emitter.emit('file:invalid', { task, errors: validationResult.errors });
        this.emitter.emit('upload:error', { task, error: task.error! });
        return;
      }

      task = updateTaskStatus(task, 'signing');
      this.tasks.set(taskId, task);
      
      if (!task) return;
      this.emitter.emit('upload:start', { task });

      const fileName = this.prepareFileName(task.file.name);
      const contentType = task.file.type || getContentType(task.file.name);

      const abortController = createAbortController();
      this.abortControllers.set(taskId, abortController);

      const signedUrlResult = await withRetry(
        () =>
          this.provider.getSignedUrl({
            fileName,
            contentType,
            fileSize: task.file.size,
            metadata: task.metadata,
            path: this.config.path,
          }),
        this.config.retry,
        { taskId }
      );

      task = updateTaskStatus(task, 'uploading');
      this.tasks.set(taskId, task);

      await this.uploadFile(task, signedUrlResult.signedUrl, abortController.signal);

      const result: UploadResult = {
        url: signedUrlResult.publicUrl,
        key: signedUrlResult.key,
        fileName: task.file.name,
        fileSize: task.file.size,
        contentType,
      };

      task = updateTaskResult(task, result);
      this.tasks.set(taskId, task);
      this.emitter.emit('upload:success', { task, result });
    } catch (error) {
      if (isAbortError(error)) {
        task = updateTaskStatus(task, 'aborted');
        this.tasks.set(taskId, task);
        this.emitter.emit('upload:abort', { task });
      } else {
        const uploadError =
          error instanceof UploadError
            ? error
            : new UploadError(
                error instanceof Error ? error.message : 'Unknown error',
                'UPLOAD_ERROR',
                { taskId, retryable: true }
              );

        task = updateTaskError(task, uploadError);
        this.tasks.set(taskId, task);
        this.emitter.emit('upload:error', { task, error: uploadError });
      }
    } finally {
      this.abortControllers.delete(taskId);
    }
  }

  private async uploadFile(task: UploadTask, signedUrl: string, signal: AbortSignal): Promise<void> {
    // If using mock provider, simulate upload without real HTTP request
    if (signedUrl.includes('mock-bucket.s3.amazonaws.com') || signedUrl.includes('signature=mock')) {
      return this.simulateMockUpload(task, signal);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percent: Math.round((event.loaded / event.total) * 100),
            speed: 0,
            estimatedTimeRemaining: 0,
          };

          const updatedTask = updateTaskProgress(task, progress);
          this.tasks.set(task.id, updatedTask);
          this.emitter.emit('upload:progress', { task: updatedTask, progress });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(
            new UploadError(`Upload failed with status ${xhr.status}`, 'UPLOAD_ERROR', {
              statusCode: xhr.status,
              taskId: task.id,
              retryable: xhr.status >= 500,
            })
          );
        }
      });

      xhr.addEventListener('error', () => {
        reject(
          new UploadError('Network error during upload', 'NETWORK_ERROR', {
            taskId: task.id,
            retryable: true,
          })
        );
      });

      xhr.addEventListener('abort', () => {
        const error = new Error('Upload aborted');
        error.name = 'AbortError';
        reject(error);
      });

      signal.addEventListener('abort', () => {
        xhr.abort();
      });

      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', task.file.type || getContentType(task.file.name));

      Object.entries(this.config.uploadHeaders).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(task.file);
    });
  }

  private async simulateMockUpload(task: UploadTask, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const fileSize = task.file.size;
      const chunkSize = 100000; // 100KB chunks for smooth progress
      const uploadSpeed = 1_000_000; // 1MB/s simulated speed
      const totalChunks = Math.ceil(fileSize / chunkSize);
      let uploadedChunks = 0;

      const uploadChunk = () => {
        if (signal.aborted) {
          const error = new Error('Upload aborted');
          error.name = 'AbortError';
          reject(error);
          return;
        }

        if (uploadedChunks >= totalChunks) {
          resolve();
          return;
        }

        uploadedChunks++;
        const loaded = Math.min(uploadedChunks * chunkSize, fileSize);
        const progress: UploadProgress = {
          loaded,
          total: fileSize,
          percent: Math.round((loaded / fileSize) * 100),
          speed: uploadSpeed,
          estimatedTimeRemaining: Math.round(((fileSize - loaded) / uploadSpeed) * 1000),
        };

        const updatedTask = updateTaskProgress(task, progress);
        this.tasks.set(task.id, updatedTask);
        this.emitter.emit('upload:progress', { task: updatedTask, progress });

        const delay = (chunkSize / uploadSpeed) * 1000;
        setTimeout(uploadChunk, delay);
      };

      signal.addEventListener('abort', () => {
        const error = new Error('Upload aborted');
        error.name = 'AbortError';
        reject(error);
      });

      uploadChunk();
    });
  }

  private prepareFileName(fileName: string): string {
    let prepared = this.config.scrubFilename(fileName);
    if (this.config.uniquePrefix) {
      prepared = addUniquePrefix(prepared);
    }
    return prepared;
  }

  abort(taskId: string): void {
    const abortController = this.abortControllers.get(taskId);
    if (abortController) {
      abortController.abort();
    }
  }

  abortAll(): void {
    this.abortControllers.forEach((controller) => controller.abort());
  }

  remove(taskId: string): void {
    this.abort(taskId);
    this.tasks.delete(taskId);
    this.emitter.emit('file:removed', { taskId });
  }

  clearCompleted(): void {
    const toRemove: string[] = [];
    this.tasks.forEach((task, id) => {
      if (isTaskComplete(task)) {
        toRemove.push(id);
      }
    });
    toRemove.forEach((id) => this.tasks.delete(id));
  }

  getTasks(): UploadTask[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): UploadTask | null {
    return this.tasks.get(taskId) ?? null;
  }

  private checkQueueComplete(): void {
    const allTasks = this.getTasks();
    const hasActive = allTasks.some((task) => isTaskActive(task) || isTaskPending(task));

    if (!hasActive && allTasks.length > 0) {
      const successful = allTasks.filter((task) => task.status === 'success');
      const failed = allTasks.filter((task) => task.status === 'error' || task.status === 'aborted');
      this.emitter.emit('queue:complete', { successful, failed });
    }
  }

  on<K extends keyof UploaderEventMap>(
    event: K,
    handler: (data: UploaderEventMap[K]) => void
  ): () => void {
    return this.emitter.on(event, handler);
  }

  once<K extends keyof UploaderEventMap>(
    event: K,
    handler: (data: UploaderEventMap[K]) => void
  ): () => void {
    return this.emitter.once(event, handler);
  }

  destroy(): void {
    this.abortAll();
    this.emitter.removeAllListeners();
    this.tasks.clear();
    this.abortControllers.clear();
  }
}
