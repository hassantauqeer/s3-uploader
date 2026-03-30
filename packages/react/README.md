# @awesome-s3-uploader/react

React hooks and components for S3 file uploads.

## Installation

```bash
npm install @awesome-s3-uploader/react
# or
pnpm add @awesome-s3-uploader/react
# or
yarn add @awesome-s3-uploader/react
```

## Quick Start

```tsx
import { useUpload } from '@awesome-s3-uploader/react';

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
