export {
  init,
  identify,
  track,
  setUserProperty,
  setUserProperties,
  flushUserProperties,
  flush,
  optOut,
  optIn,
  isOptedOut,
  destroy,
} from './singleton.js';

export type { AppssConfig, EventProperties, UserProperties, OnErrorCallback, RetryConfig } from '@appss/sdk-core';
export type { ErrorSeverity } from '@appss/sdk-core';

export {
  AppssError,
  ErrorCode,
  NotInitializedError,
  NotIdentifiedError,
  InvalidApiKeyError,
  NetworkError,
  RateLimitError,
  ApiKeyRevokedError,
  ProtocolError,
  QueueOverflowError,
  MaxRetriesExceededError,
} from '@appss/sdk-core';