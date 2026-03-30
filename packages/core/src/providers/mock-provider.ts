import type {
  UploadProvider,
  SignedUrlParams,
  SignedUrlResult,
  InitiateMultipartParams,
  MultipartInitResult,
  PartSignedUrlParams,
  CompleteMultipartParams,
  CompleteMultipartResult,
  AbortMultipartParams,
} from '../types';
import { UploadError } from '../types';
import { generateUniqueId } from '../utils/unique-id';

export interface MockProviderConfig {
  signingDelay?: number;
  uploadSpeed?: number;
  failRate?: number;
  failError?: { statusCode: number; message: string };
  completionDelay?: number;
  baseUrl?: string;
}

const DEFAULT_CONFIG: Required<MockProviderConfig> = {
  signingDelay: 200,
  uploadSpeed: 1_000_000,
  failRate: 0,
  failError: { statusCode: 500, message: 'Simulated server error' },
  completionDelay: 500,
  baseUrl: 'https://mock-bucket.s3.amazonaws.com',
};

export function createMockProvider(config?: MockProviderConfig): UploadProvider {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const multipartSessions = new Map<string, { key: string; parts: Map<number, string> }>();

  return {
    async getSignedUrl(params: SignedUrlParams): Promise<SignedUrlResult> {
      await simulateDelay(finalConfig.signingDelay);
      checkForSimulatedFailure(finalConfig);

      const key = buildKey(params.path, params.fileName);
      const signedUrl = `${finalConfig.baseUrl}/${key}?signature=mock`;
      const publicUrl = `${finalConfig.baseUrl}/${key}`;

      return {
        signedUrl,
        publicUrl,
        key,
        headers: {
          'Content-Type': params.contentType,
          ...(params.metadata && buildMetadataHeaders(params.metadata)),
        },
      };
    },

    async initiateMultipart(params: InitiateMultipartParams): Promise<MultipartInitResult> {
      await simulateDelay(finalConfig.signingDelay);
      checkForSimulatedFailure(finalConfig);

      const uploadId = generateUniqueId();
      const key = buildKey(params.path, params.fileName);

      multipartSessions.set(uploadId, { key, parts: new Map() });

      return { uploadId, key };
    },

    async getPartSignedUrl(params: PartSignedUrlParams): Promise<SignedUrlResult> {
      await simulateDelay(finalConfig.signingDelay);
      checkForSimulatedFailure(finalConfig);

      const session = multipartSessions.get(params.uploadId);
      if (!session) {
        throw new UploadError(
          `Multipart session ${params.uploadId} not found`,
          'MULTIPART_INIT_ERROR',
          { statusCode: 404, retryable: false }
        );
      }

      const signedUrl = `${finalConfig.baseUrl}/${session.key}?uploadId=${params.uploadId}&partNumber=${params.partNumber}&signature=mock`;
      const publicUrl = `${finalConfig.baseUrl}/${session.key}`;

      return {
        signedUrl,
        publicUrl,
        key: session.key,
      };
    },

    async completeMultipart(params: CompleteMultipartParams): Promise<CompleteMultipartResult> {
      await simulateDelay(finalConfig.completionDelay);
      checkForSimulatedFailure(finalConfig);

      const session = multipartSessions.get(params.uploadId);
      if (!session) {
        throw new UploadError(
          `Multipart session ${params.uploadId} not found`,
          'MULTIPART_COMPLETE_ERROR',
          { statusCode: 404, retryable: false }
        );
      }

      params.parts.forEach((part) => {
        session.parts.set(part.partNumber, part.etag);
      });

      const publicUrl = `${finalConfig.baseUrl}/${session.key}`;
      const etag = `"${generateUniqueId()}"`;

      multipartSessions.delete(params.uploadId);

      return {
        publicUrl,
        key: session.key,
        etag,
      };
    },

    async abortMultipart(params: AbortMultipartParams): Promise<void> {
      await simulateDelay(100);
      multipartSessions.delete(params.uploadId);
    },
  };
}

function buildKey(path: string | undefined, fileName: string): string {
  const prefix = path ? path.replace(/^\/+|\/+$/g, '') : '';
  return prefix ? `${prefix}/${fileName}` : fileName;
}

function buildMetadataHeaders(metadata: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {};
  Object.entries(metadata).forEach(([key, value]) => {
    headers[`x-amz-meta-${key}`] = value;
  });
  return headers;
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkForSimulatedFailure(config: Required<MockProviderConfig>): void {
  if (config.failRate > 0 && Math.random() < config.failRate) {
    throw new UploadError(
      config.failError.message,
      'UPLOAD_ERROR',
      { statusCode: config.failError.statusCode, retryable: true }
    );
  }
}
