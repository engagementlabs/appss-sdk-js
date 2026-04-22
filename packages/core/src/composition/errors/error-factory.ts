import { ErrorCode } from '../../shared/errors/error-codes.js';
import type { AppssError } from '../../shared/errors/appss-error.js';
import {
  NetworkError,
  RateLimitError,
  ApiKeyRevokedError,
  ProtocolError,
} from '../../shared/errors/index.js';

export function createTransportError(
  code: ErrorCode,
  message?: string,
  retryAfterMs?: number,
): AppssError {
  switch (code) {
    case ErrorCode.NETWORK_ERROR:
      return new NetworkError(message);
    case ErrorCode.RATE_LIMITED:
      return new RateLimitError(message, retryAfterMs);
    case ErrorCode.API_KEY_REVOKED:
      return new ApiKeyRevokedError(message);
    case ErrorCode.PROTOCOL_ERROR:
      return new ProtocolError(message);
    default:
      return new ProtocolError(message ?? `Transport error: ${code}`);
  }
}
