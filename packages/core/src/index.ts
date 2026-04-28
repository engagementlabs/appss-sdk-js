export type {
  AppssConfig,
  ResolvedConfig,
  RetryConfig,
  OnErrorCallback,
  AppssEvent,
  EventProperties,
  UserProperties,
  TransportResponse,
  DistinctId,
} from './shared/types/index.js';

export { resolveDistinctId } from './shared/types/index.js';

export type { ITransport } from './ports/transport.js';
export type { IEventQueue } from './ports/queue.js';
export type { ILogger } from './ports/logger.js';

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
} from './shared/errors/index.js';
export type { ErrorSeverity } from './shared/errors/index.js';

export { storageKey } from './shared/storage-key.js';

export { AbstractAppssClient } from './composition/index.js';
