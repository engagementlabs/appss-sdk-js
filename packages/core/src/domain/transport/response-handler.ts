import type { TransportResponse } from '../../shared/types/wire-protocol.js';
import type { HandleResult } from '../../shared/types/internal.js';
import { TransportAction } from '../../shared/types/internal.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';

export function handleResponse(response: TransportResponse): HandleResult {
  const { statusCode } = response;

  if (statusCode >= 200 && statusCode < 300) {
    return { action: TransportAction.SUCCESS };
  }

  if (statusCode === 400) {
    return { action: TransportAction.DROP, errorCode: ErrorCode.PROTOCOL_ERROR };
  }

  if (statusCode === 401) {
    return { action: TransportAction.STOP, errorCode: ErrorCode.API_KEY_REVOKED };
  }

  if (statusCode === 413) {
    return { action: TransportAction.SPLIT_AND_RETRY };
  }

  if (statusCode === 429) {
    const retryAfterHeader = response.headers['retry-after'];
    const retryAfterMs = retryAfterHeader ? parseFloat(retryAfterHeader) * 1000 : undefined;
    return {
      action: TransportAction.RATE_LIMIT,
      retryAfterMs,
      errorCode: ErrorCode.RATE_LIMITED,
    };
  }

  if (statusCode >= 500) {
    return {
      action: TransportAction.RETRY,
      errorCode: ErrorCode.NETWORK_ERROR,
      errorMessage: `Server error: ${statusCode}`,
    };
  }

  return {
    action: TransportAction.DROP,
    errorCode: ErrorCode.PROTOCOL_ERROR,
    errorMessage: `Unexpected status: ${statusCode}`,
  };
}
