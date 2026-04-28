import type { ITransport } from '../../ports/transport.js';
import type { IEventQueue } from '../../ports/queue.js';
import type { ILogger } from '../../ports/logger.js';
import type { AppssConfig, ResolvedConfig } from '../../shared/types/config.js';
import type { DistinctId } from '../../shared/types/distinct-id.js';
import type {
  EventProperties,
  EventPayload,
  UserPropertiesRequest,
} from '../../shared/types/wire-protocol.js';
import { resolveDistinctId } from '../../shared/types/distinct-id.js';
import type { AppssError } from '../../shared/errors/appss-error.js';

import { validateConfig, resolveConfig } from '../../shared/config/config.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import { FlushPolicy } from '../../domain/queue/flush-policy.js';
import { RetryPolicy } from '../../domain/transport/retry-policy.js';
import { buildEvent, eventToPayload } from '../../domain/event/event-builder.js';
import { NotInitializedError } from '../../shared/errors/index.js';
import { EVENTS_PATH, USER_PROPERTIES_PATH } from '../../shared/constants.js';
import { BatchDispatcher } from '../dispatcher/batch-dispatcher.js';
import { buildHeaders } from '../headers/header-builder.js';
import { EventEnricher } from '../enrichment/event-enricher.js';

export abstract class AbstractAppssClient {
  private config: ResolvedConfig | null = null;
  private logger: ILogger | null = null;
  private transport: ITransport | null = null;
  private queue: IEventQueue | null = null;
  private dispatcher: BatchDispatcher | null = null;
  private flushPolicy: FlushPolicy | null = null;
  private initialized = false;
  private readonly enricher = new EventEnricher();

  protected abstract createTransport(config: ResolvedConfig): ITransport;
  protected abstract createQueue(config: ResolvedConfig): IEventQueue;
  protected abstract createLogger(config: ResolvedConfig): ILogger;
  protected abstract registerLifecycleHandlers(): void;
  protected abstract unregisterLifecycleHandlers(): void;

  init(config: AppssConfig): void {
    if (this.initialized) {
      this.destroySync();
    }

    validateConfig(config);
    this.config = resolveConfig(config);
    this.logger = config.logger ?? this.createLogger(this.config);
    this.transport = this.createTransport(this.config);
    this.queue = config.queue ?? this.createQueue(this.config);
    this.dispatcher = new BatchDispatcher(
      this.transport,
      new RetryPolicy(this.config.retry),
      this.logger,
    );
    this.flushPolicy = new FlushPolicy(this.config.flushInterval);

    this.flushPolicy.start(() => this.doFlush());
    this.registerLifecycleHandlers();
    this.initialized = true;

    this.logger.info('SDK initialized', { endpoint: this.config.endpoint });
  }

  async destroy(): Promise<void> {
    if (!this.initialized) return;

    await this.flush();
    this.destroySync();

    this.logger?.info('SDK destroyed');
  }

  track(distinctId: DistinctId, event: string, properties?: EventProperties): void {
    if (!this.guardInitialized()) return;
    const id = resolveDistinctId(distinctId);
    if (!id) return;

    const enrichedProperties = this.enricher.enrich(properties);
    const appssEvent = buildEvent({ event, distinctId: id, properties: enrichedProperties });

    this.queue?.enqueue(appssEvent);
    this.logger?.debug('Event enqueued', { event, distinctId: id, queueSize: this.queue?.size() ?? 0 });

    if ((this.queue?.size() ?? 0) >= (this.config?.batchSize ?? Infinity)) {
      void this.flush();
    }
  }

  setUserProperty(distinctId: DistinctId, key: string, value: unknown): void {
    if (!this.guardInitialized()) return;
    const id = resolveDistinctId(distinctId);
    if (!id) return;

    void this.sendUserProperties(id, { [key]: value });
  }

  setUserProperties(distinctId: DistinctId, properties: Record<string, unknown>): void {
    if (!this.guardInitialized()) return;
    const id = resolveDistinctId(distinctId);
    if (!id) return;

    void this.sendUserProperties(id, properties);
  }

  async flush(): Promise<void> {
    if (!this.flushPolicy) return;
    return this.flushPolicy.flush();
  }

  setSuperProperties(properties: Record<string, unknown>): void {
    this.enricher.setAll(properties);
  }

  resetSuperProperties(): void {
    this.enricher.reset();
  }

  protected handleError(error: AppssError): void {
    if (this.config?.debug && error.code === ErrorCode.NOT_INITIALIZED) {
      throw error;
    }

    if (error.severity === 'warn') {
      this.logger?.warn(error.message, { code: error.code });
    } else {
      this.logger?.error(error.message, { code: error.code });
    }

    try {
      this.config?.onError?.(error);
    } catch {
      /* noop */
    }
  }

  private guardInitialized(): boolean {
    if (this.initialized) return true;
    this.handleError(new NotInitializedError());
    return false;
  }

  private destroySync(): void {
    this.flushPolicy?.stop();
    this.unregisterLifecycleHandlers();
    this.initialized = false;
  }

  private async doFlush(): Promise<void> {
    if (!this.config || !this.queue || !this.dispatcher) return;
    if (this.queue.isEmpty()) return;

    const events = this.queue.peek(this.config.batchSize);
    const payloads = events.map(eventToPayload);
    const headers = buildHeaders(this.config);

    await this.sendBatchWithSplit(payloads, headers);
  }

  private async sendBatchWithSplit(
    batch: EventPayload[],
    headers: Record<string, string>,
  ): Promise<void> {
    if (!this.queue || !this.dispatcher) return;

    const result = await this.dispatcher.dispatch(EVENTS_PATH, { batch }, headers);

    if (result.splitRequested && batch.length > 1) {
      const mid = Math.ceil(batch.length / 2);
      await this.sendBatchWithSplit(batch.slice(0, mid), headers);
      await this.sendBatchWithSplit(batch.slice(mid), headers);
      return;
    }

    if (result.success) {
      this.queue.drain(batch.length);
      this.flushPolicy?.reset();
    }
    if (result.error) {
      this.handleError(result.error);
    }
  }

  private async sendUserProperties(
    distinctId: string,
    properties: Record<string, unknown>,
  ): Promise<void> {
    if (!this.config || !this.dispatcher) return;

    const body: UserPropertiesRequest = { distinct_id: distinctId, properties };
    const headers = buildHeaders(this.config);
    const result = await this.dispatcher.dispatch(USER_PROPERTIES_PATH, body, headers);

    if (result.error) {
      this.handleError(result.error);
    }
  }
}
