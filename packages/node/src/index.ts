export { AppssNodeClient, createAppss } from './client/node-client.js';
export { fromTelegrafContext } from './helpers/telegraf.js';
export { fromGrammyContext } from './helpers/grammy.js';
export type { TelegramUserProperties, ExtractedContext } from './helpers/extract.js';
export { MemoryQueue } from './queue/memory-queue.js';

export type { AppssConfig, EventProperties, UserProperties, OnErrorCallback, RetryConfig, DistinctId } from '@appss/sdk-core';
export type { IEventQueue, ILogger, ErrorSeverity } from '@appss/sdk-core';
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
