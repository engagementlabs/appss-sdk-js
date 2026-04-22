import type { ITransport } from '../../ports/transport.js';
import type { IEventQueue } from '../../ports/queue.js';
import type { ILogger } from '../../ports/logger.js';
import type { AppssConfig, ResolvedConfig } from '../../shared/types/config.js';
import type {
  EventProperties,
  EventPayload,
  UserPropertiesRequest,
} from '../../shared/types/wire-protocol.js';
import type { AppssError } from '../../shared/errors/appss-error.js';

import { validateConfig, resolveConfig } from '../../shared/config/config.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import { Readiness, ReadinessGuard } from '../../domain/readiness/readiness-guard.js';
import { IdentityManager } from '../../domain/identity/identity-manager.js';
import { ConsentManager } from '../../domain/consent/consent-manager.js';
import { FlushPolicy } from '../../domain/queue/flush-policy.js';
import { RetryPolicy } from '../../domain/transport/retry-policy.js';
import { buildEvent, eventToPayload } from '../../domain/event/event-builder.js';
import { NotInitializedError, NotIdentifiedError } from '../../shared/errors/index.js';
import { EVENTS_PATH, USER_PROPERTIES_PATH } from '../../shared/constants.js';
import { BatchDispatcher } from '../dispatcher/batch-dispatcher.js';
import { buildHeaders } from '../headers/header-builder.js';

export abstract class AbstractAppssClient {
  private config: ResolvedConfig | null = null;
  private logger: ILogger | null = null;
  private transport: ITransport | null = null;
  private queue: IEventQueue | null = null;
  private dispatcher: BatchDispatcher | null = null;
  private readiness = new ReadinessGuard();
  private identity = new IdentityManager();
  private consent = new ConsentManager();
  private flushPolicy: FlushPolicy | null = null;

  protected abstract createTransport(config: ResolvedConfig): ITransport;
  protected abstract createQueue(config: ResolvedConfig): IEventQueue;
  protected abstract createLogger(config: ResolvedConfig): ILogger;
  protected abstract registerLifecycleHandlers(): void;
  protected abstract unregisterLifecycleHandlers(): void;

  // ── Lifecycle ──

  init(config: AppssConfig): void {
    if (this.readiness.isConfigured()) {
      this.destroySync();
    }

    validateConfig(config);
    this.config = resolveConfig(config);
    this.logger = config.logger ?? this.createLogger(this.config);
    this.transport = this.createTransport(this.config);
    this.queue = this.createQueue(this.config);
    this.dispatcher = new BatchDispatcher(
      this.transport,
      new RetryPolicy(this.config.retry),
      this.logger,
    );
    this.identity = new IdentityManager();
    this.consent = new ConsentManager();
    this.flushPolicy = new FlushPolicy(this.config.flushInterval);

    this.flushPolicy.start(() => void this.flush());
    this.registerLifecycleHandlers();
    this.readiness.transition(Readiness.Configured);

    this.logger.info('SDK initialized', { endpoint: this.config.endpoint });
  }

  async destroy(): Promise<void> {
    if (!this.readiness.isConfigured()) return;

    await this.flushUserProperties();
    await this.flush();
    this.destroySync();

    this.logger?.info('SDK destroyed');
  }

  // ── Identity ──

  identify(distinctId: string): void {
    if (!this.guardConfigured()) return;

    if (!distinctId || distinctId.trim().length === 0) {
      this.handleError(new NotIdentifiedError('distinctId is required and cannot be empty.'));
      return;
    }

    this.identity.identify(distinctId);
    this.readiness.transition(Readiness.Ready);

    this.logger?.info('User identified', { distinctId });
  }

  setUserProperty(key: string, value: unknown): void {
    if (!this.guardReady()) return;

    this.identity.setUserProperty(key, value);
    void this.flushUserProperties();
  }

  // ── Tracking ──

  track(event: string, properties?: EventProperties): void {
    if (!this.guardReady()) return;

    if (this.consent.isOptedOut()) {
      this.logger?.debug('Event dropped: opted out', { event });
      return;
    }

    const appssEvent = buildEvent({
      event,
      distinctId: this.identity.getDistinctId() ?? '',
      properties,
    });

    this.queue?.enqueue(appssEvent);
    this.logger?.debug('Event enqueued', { event, queueSize: this.queue?.size() ?? 0 });

    if ((this.queue?.size() ?? 0) >= (this.config?.batchSize ?? Infinity)) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (!this.config || !this.queue || !this.dispatcher) return;
    if (this.queue.isEmpty()) return;

    const events = this.queue.peek(this.config.batchSize);
    const payloads = events.map(eventToPayload);
    const headers = buildHeaders(this.config);

    await this.sendBatchWithSplit(payloads, headers);
  }

  // ── Consent ──

  optOut(): void {
    this.consent.optOut();
    this.logger?.info('Tracking opted out');
  }

  optIn(): void {
    this.consent.optIn();
    this.logger?.info('Tracking opted in');
  }

  isOptedOut(): boolean {
    return this.consent.isOptedOut();
  }

  // ── Private: events ──

  private async sendBatchWithSplit(batch: EventPayload[], headers: Record<string, string>): Promise<void> {
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

  // ── Private: user properties ──

  private async flushUserProperties(): Promise<void> {
    if (!this.config || !this.dispatcher) return;

    const props = this.identity.peekPendingProperties();
    if (!props) return;

    const distinctId = this.identity.getDistinctId();
    if (!distinctId) return;

    const body: UserPropertiesRequest = {
      distinct_id: distinctId,
      properties: props,
    };
    const headers = buildHeaders(this.config);
    const result = await this.dispatcher.dispatch(USER_PROPERTIES_PATH, body, headers);

    if (result.success) {
      this.identity.clearPendingProperties();
    }
    if (result.error) {
      this.handleError(result.error);
    }
  }

  // ── Private: guards ──

  private guardConfigured(): boolean {
    if (this.readiness.isConfigured()) return true;
    this.handleError(new NotInitializedError());
    return false;
  }

  private guardReady(): boolean {
    if (this.readiness.canTrack()) return true;
    this.handleError(
      this.readiness.canIdentify() ? new NotIdentifiedError() : new NotInitializedError(),
    );
    return false;
  }

  // ── Private: cleanup ──

  private destroySync(): void {
    this.flushPolicy?.stop();
    this.unregisterLifecycleHandlers();
    this.identity.reset();
    this.readiness.reset();
  }

  // ── Private: error routing ──

  private handleError(error: AppssError): void {
    if (
      this.config?.debug &&
      (error.code === ErrorCode.NOT_INITIALIZED || error.code === ErrorCode.NOT_IDENTIFIED)
    ) {
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
      // user callback must not crash the SDK
    }
  }
}
