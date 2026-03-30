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

export interface S3ProviderConfig {
  signingUrl: string;
  signingMethod?: 'GET' | 'POST';
  signingHeaders?: Record<string, string> | (() => Record<string, string>);
  signingParams?: Record<string, string>;
  withCredentials?: boolean;
  multipartUrl?: string;
  requestFn?: (url: string, options: RequestInit) => Promise<Response>;
}

export function createS3Provider(config: S3ProviderConfig): UploadProvider {
  const signingMethod = config.signingMethod ?? 'GET';
  const multipartUrl = config.multipartUrl ?? `${config.signingUrl}/multipart`;
  const requestFn = config.requestFn ?? fetch.bind(globalThis);

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
      await makeSigningRequest(`${multipartUrl}/abort`, {
        uploadId: params.uploadId,
        key: params.key,
      });
    },
  };
}
