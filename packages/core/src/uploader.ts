import type { UploaderConfig, Uploader } from './types';
import { UploadManager } from './upload-manager';

export function createUploader(config: UploaderConfig): Uploader {
  const manager = new UploadManager(config);

  return {
    addFiles: (files) => manager.addFiles(files),
    upload: (taskId) => manager.startUpload(taskId),
    uploadAll: () => {
      const tasks = manager.getTasks();
      tasks.forEach((task) => {
        if (task.status === 'idle') {
          manager.startUpload(task.id);
        }
      });
    },
    abort: (taskId) => manager.abort(taskId),
    abortAll: () => manager.abortAll(),
    pause: () => {
      throw new Error('Pause not yet implemented');
    },
    resume: () => {
      throw new Error('Resume not yet implemented');
    },
    remove: (taskId) => manager.remove(taskId),
    clearCompleted: () => manager.clearCompleted(),
    getTasks: () => manager.getTasks(),
    getTask: (taskId) => manager.getTask(taskId),
    on: (event, handler) => manager.on(event, handler),
    once: (event, handler) => manager.once(event, handler),
    destroy: () => manager.destroy(),
  };
}
