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
  SignerFunction,
  MultipartSignerFunctions,
} from '../types';
import { UploadError } from '../types';

export interface S3ProviderConfig {
  // Simple mode: URL-based signing
  signingUrl?: string;
  signingMethod?: 'GET' | 'POST';
  signingHeaders?: Record<string, string> | (() => Record<string, string>);
  signingParams?: Record<string, string>;
  withCredentials?: boolean;
  multipartUrl?: string;
  requestFn?: (url: string, options: RequestInit) => Promise<Response>;
  
  // Advanced mode: Custom signer functions
  signer?: SignerFunction;
  multipartSigner?: MultipartSignerFunctions;
  
  // Multipart configuration
  multipartThreshold?: number; // File size threshold for multipart upload (default: 100MB)
  chunkSize?: number; // Size of each part in multipart upload (default: 10MB)
  maxConcurrency?: number; // Max concurrent part uploads (default: 4)
}

export function createS3Provider(config: S3ProviderConfig): UploadProvider {
  // Validate config: must have either signingUrl or signer
  if (!config.signingUrl && !config.signer) {
    throw new Error('S3Provider requires either signingUrl or signer function');
  }

  const signingMethod = config.signingMethod ?? 'GET';
  const multipartUrl = config.multipartUrl ?? (config.signingUrl ? `${config.signingUrl}/multipart` : '');
  const requestFn = config.requestFn ?? fetch.bind(globalThis);
  
  // Store multipart config for use by upload manager
  const multipartThreshold = config.multipartThreshold;
  const chunkSize = config.chunkSize;
  const maxConcurrency = config.maxConcurrency;

  async function makeSigningRequest(
    url: string,
    params?: Record<string, unknown>
  ): Promise<Response> {
    const headers = typeof config.signingHeaders === 'function' 
      ? config.signingHeaders() 
      : config.signingHeaders ?? {};

    let finalUrl = url;
    let body: string | undefined;

    if (signingMethod === 'GET') {
      const queryParams = new URLSearchParams({
        ...config.signingParams,
        ...(params as Record<string, string>),
      });
      finalUrl = `${url}?${queryParams.toString()}`;
    } else {
      body = JSON.stringify({
        ...config.signingParams,
        ...params,
      });
      headers['Content-Type'] = 'application/json';
    }

    const response = await requestFn(finalUrl, {
      method: signingMethod,
      headers,
      body,
      credentials: config.withCredentials ? 'include' : 'same-origin',
    });

    if (!response.ok) {
      throw new UploadError(
        `Signing request failed: ${response.statusText}`,
        'SIGNING_ERROR',
        { statusCode: response.status, retryable: response.status >= 500 }
      );
    }

    return response;
  }

  return {
    async getSignedUrl(params: SignedUrlParams): Promise<SignedUrlResult> {
      // Use custom signer if provided
      if (config.signer) {
        // Create a minimal File object for the signer (we don't have the actual file here)
        const dummyFile = new File([], params.fileName, { type: params.contentType });
        return await config.signer(dummyFile, params);
      }

      // Fall back to URL-based signing
      if (!config.signingUrl) {
        throw new UploadError(
          'No signing URL or signer function provided',
          'SIGNING_ERROR',
          { retryable: false }
        );
      }

      const response = await makeSigningRequest(config.signingUrl, {
        fileName: params.fileName,
        contentType: params.contentType,
        fileSize: params.fileSize,
        metadata: params.metadata,
        path: params.path,
      });

      const data = await response.json();

      if (!data.signedUrl || !data.publicUrl || !data.key) {
        throw new UploadError(
          'Invalid response from signing server: missing required fields',
          'SIGNING_ERROR',
          { retryable: false }
        );
      }

      return {
        signedUrl: data.signedUrl,
        publicUrl: data.publicUrl,
        key: data.key,
        headers: data.headers,
      };
    },

    async initiateMultipart(params: InitiateMultipartParams): Promise<MultipartInitResult> {
      // Use custom multipart signer if provided
      if (config.multipartSigner?.initiate) {
        const dummyFile = new File([], params.fileName, { type: params.contentType });
        return await config.multipartSigner.initiate(dummyFile, params);
      }

      // Fall back to URL-based signing
      if (!multipartUrl) {
        throw new UploadError(
          'No multipart URL or multipart signer provided',
          'MULTIPART_INIT_ERROR',
          { retryable: false }
        );
      }

      const response = await makeSigningRequest(`${multipartUrl}/initiate`, {
        fileName: params.fileName,
        contentType: params.contentType,
        fileSize: params.fileSize,
        metadata: params.metadata,
        path: params.path,
      });

      const data = await response.json();

      if (!data.uploadId || !data.key) {
        throw new UploadError(
          'Invalid response from multipart initiate: missing required fields',
          'MULTIPART_INIT_ERROR',
          { retryable: false }
        );
      }

      return {
        uploadId: data.uploadId,
        key: data.key,
      };
    },

    async getPartSignedUrl(params: PartSignedUrlParams): Promise<SignedUrlResult> {
      // Use custom multipart signer if provided
      if (config.multipartSigner?.signPart) {
        const dummyFile = new File([], params.key, { type: 'application/octet-stream' });
        return await config.multipartSigner.signPart(dummyFile, params);
      }

      // Fall back to URL-based signing
      if (!multipartUrl) {
        throw new UploadError(
          'No multipart URL or multipart signer provided',
          'MULTIPART_PART_ERROR',
          { retryable: false }
        );
      }

      const response = await makeSigningRequest(`${multipartUrl}/sign-part`, {
        uploadId: params.uploadId,
        key: params.key,
        partNumber: params.partNumber,
        contentLength: params.contentLength,
      });

      const data = await response.json();

      if (!data.signedUrl || !data.key) {
        throw new UploadError(
          'Invalid response from part signing: missing required fields',
          'MULTIPART_PART_ERROR',
          { retryable: false }
        );
      }

      return {
        signedUrl: data.signedUrl,
        publicUrl: data.publicUrl ?? '',
        key: data.key,
      };
    },

    async completeMultipart(params: CompleteMultipartParams): Promise<CompleteMultipartResult> {
      // Use custom multipart signer if provided
      if (config.multipartSigner?.complete) {
        const dummyFile = new File([], params.key, { type: 'application/octet-stream' });
        return await config.multipartSigner.complete(dummyFile, params);
      }

      // Fall back to URL-based signing
      if (!multipartUrl) {
        throw new UploadError(
          'No multipart URL or multipart signer provided',
          'MULTIPART_COMPLETE_ERROR',
          { retryable: false }
        );
      }

      const response = await makeSigningRequest(`${multipartUrl}/complete`, {
        uploadId: params.uploadId,
        key: params.key,
        parts: params.parts,
      });

      const data = await response.json();

      if (!data.publicUrl || !data.key) {
        throw new UploadError(
          'Invalid response from multipart complete: missing required fields',
          'MULTIPART_COMPLETE_ERROR',
          { retryable: false }
        );
      }

      return {
        publicUrl: data.publicUrl,
        key: data.key,
        etag: data.etag ?? '',
      };
    },

    async abortMultipart(params: AbortMultipartParams): Promise<void> {
      // Use custom multipart signer if provided
      if (config.multipartSigner?.abort) {
        const dummyFile = new File([], params.key, { type: 'application/octet-stream' });
        return await config.multipartSigner.abort(dummyFile, params);
      }

      // Fall back to URL-based signing
      if (!multipartUrl) {
        throw new UploadError(
          'No multipart URL or multipart signer provided',
          'ABORT_ERROR',
          { retryable: false }
        );
      }

      await makeSigningRequest(`${multipartUrl}/abort`, {
        uploadId: params.uploadId,
        key: params.key,
      });
    },
    
    // Include config values so upload manager can use them
    multipartThreshold,
    chunkSize,
    maxConcurrency,
  };
}
