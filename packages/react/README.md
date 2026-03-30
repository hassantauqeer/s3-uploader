# @s3up/react

React hooks and components for S3 file uploads.

## Installation

```bash
npm install @s3up/react
# or
pnpm add @s3up/react
# or
yarn add @s3up/react
```

## Quick Start

```tsx
import { useUpload } from '@s3up/react';

function UploadButton() {
  const { upload, status, progress, result } = useUpload({ provider: 'mock' });

  return (
    <div>
      <button onClick={() => upload()}>Upload File</button>
      {status === 'uploading' && <p>Progress: {progress?.percent}%</p>}
      {status === 'success' && <p>Uploaded: {result?.url}</p>}
    </div>
  );
}
```

## Documentation

Full documentation available at [https://YOUR_ORG.github.io/s3up](https://YOUR_ORG.github.io/s3up)

## License

MIT
