export function scrubFilename(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename;
  const ext = lastDotIndex > 0 ? filename.slice(lastDotIndex) : '';

  const scrubbed = name
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .toLowerCase();

  return scrubbed + ext.toLowerCase();
}

export function addUniquePrefix(filename: string): string {
  const prefix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().split('-')[0]
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return `${prefix}-${filename}`;
}

export function getContentDisposition(
  filename: string,
  contentType: string,
  mode: 'inline' | 'attachment' | 'auto'
): string {
  let disposition: 'inline' | 'attachment';

  if (mode === 'auto') {
    disposition = contentType.startsWith('image/') ? 'inline' : 'attachment';
  } else {
    disposition = mode;
  }

  const encodedFilename = encodeURIComponent(filename);
  return `${disposition}; filename="${filename}"; filename*=UTF-8''${encodedFilename}`;
}
