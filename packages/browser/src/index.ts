export {
  init,
  identify,
  track,
  setUserProperty,
  setUserProperties,
  flush,
  optOut,
  optIn,
  isOptedOut,
  destroy,
} from './singleton.js';

export type { AppssConfig, EventProperties, UserProperties, OnErrorCallback, RetryConfig, DistinctId, PurchaseProperties, ReservedEventMap, EventName, TrackArgs } from '@appss/sdk-core';
export { PURCHASE_EVENT } from '@appss/sdk-core';
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