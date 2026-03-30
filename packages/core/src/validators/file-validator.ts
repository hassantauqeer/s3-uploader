import type { ValidationConfig } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export async function validateFile(
  file: File,
  config: ValidationConfig
): Promise<ValidationResult> {
  const errors: string[] = [];

  if (config.blockedTypes && config.blockedTypes.length > 0) {
    if (isTypeBlocked(file.type, config.blockedTypes)) {
      errors.push(`File type "${file.type}" is not allowed`);
      return { valid: false, errors };
    }
  }

  if (config.allowedTypes && config.allowedTypes.length > 0) {
    if (!isTypeAllowed(file.type, config.allowedTypes)) {
      errors.push(`File type "${file.type}" is not allowed. Allowed types: ${config.allowedTypes.join(', ')}`);
    }
  }

  if (config.allowedExtensions && config.allowedExtensions.length > 0) {
    const ext = getFileExtension(file.name);
    if (!config.allowedExtensions.includes(ext)) {
      errors.push(`File extension "${ext}" is not allowed. Allowed extensions: ${config.allowedExtensions.join(', ')}`);
    }
  }

  const minSize = config.minFileSize ?? 1;
  if (file.size < minSize) {
    errors.push(`File size ${formatBytes(file.size)} is below minimum ${formatBytes(minSize)}`);
  }

  if (config.maxFileSize !== null && config.maxFileSize !== undefined) {
    if (file.size > config.maxFileSize) {
      errors.push(`File size ${formatBytes(file.size)} exceeds maximum ${formatBytes(config.maxFileSize)}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  if (config.image && file.type.startsWith('image/')) {
    const imageErrors = await validateImageDimensions(file, config.image);
    errors.push(...imageErrors);
  }

  if (config.custom) {
    try {
      const customError = await config.custom(file);
      if (customError) {
        errors.push(customError);
      }
    } catch (error) {
      errors.push(`Custom validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isTypeAllowed(fileType: string, allowedTypes: string[]): boolean {
  return allowedTypes.some((allowed) => {
    // Wildcard '*' allows all file types
    if (allowed === '*') {
      return true;
    }
    // Pattern like 'image/*' matches 'image/png', 'image/jpeg', etc.
    if (allowed.endsWith('/*')) {
      const prefix = allowed.slice(0, -2);
      return fileType.startsWith(prefix + '/');
    }
    // Exact match like 'application/pdf'
    return fileType === allowed;
  });
}

function isTypeBlocked(fileType: string, blockedTypes: string[]): boolean {
  return blockedTypes.some((blocked) => {
    if (blocked.endsWith('/*')) {
      const prefix = blocked.slice(0, -2);
      return fileType.startsWith(prefix + '/');
    }
    return fileType === blocked;
  });
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(lastDot).toLowerCase() : '';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

async function validateImageDimensions(
  file: File,
  config: NonNullable<ValidationConfig['image']>
): Promise<string[]> {
  const errors: string[] = [];

  try {
    const dimensions = await getImageDimensions(file);

    if (config.minWidth && dimensions.width < config.minWidth) {
      errors.push(`Image width ${dimensions.width}px is below minimum ${config.minWidth}px`);
    }

    if (config.maxWidth && dimensions.width > config.maxWidth) {
      errors.push(`Image width ${dimensions.width}px exceeds maximum ${config.maxWidth}px`);
    }

    if (config.minHeight && dimensions.height < config.minHeight) {
      errors.push(`Image height ${dimensions.height}px is below minimum ${config.minHeight}px`);
    }

    if (config.maxHeight && dimensions.height > config.maxHeight) {
      errors.push(`Image height ${dimensions.height}px exceeds maximum ${config.maxHeight}px`);
    }

    if (config.aspectRatio) {
      const actualRatio = dimensions.width / dimensions.height;
      const tolerance = 0.01;
      if (Math.abs(actualRatio - config.aspectRatio) > tolerance) {
        errors.push(
          `Image aspect ratio ${actualRatio.toFixed(2)} does not match required ${config.aspectRatio.toFixed(2)}`
        );
      }
    }
  } catch (error) {
    errors.push(`Failed to validate image dimensions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return errors;
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
