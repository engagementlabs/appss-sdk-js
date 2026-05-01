import {
  AbstractAppssClient,
  storageKey,
  type AppssConfig,
  type ResolvedConfig,
  type ITransport,
  type IEventQueue,
  type ILogger,
  type DistinctId,
  type EventName,
  type TrackArgs,
} from '@appss/sdk-core';

import { SDK_PLATFORM } from './constants.js';
import { FetchTransport } from './transport/fetch-transport.js';
import { PersistentQueue } from './queue/persistent-queue.js';
import { ConsoleLogger } from './logger/console-logger.js';
import { NoopLogger } from './logger/noop-logger.js';
import { PageLifecycleManager } from './lifecycle/page-lifecycle.js';
import { BrowserIdentityManager } from './identity/identity-manager.js';
import { BrowserConsentManager } from './consent/consent-manager.js';

export class BrowserAppssClient extends AbstractAppssClient {
  private lifecycle: PageLifecycleManager | null = null;
  private readonly identity = new BrowserIdentityManager();
  private readonly consent = new BrowserConsentManager();

  override init(config: AppssConfig): void {
    super.init(config);
    this.setSuperProperties({ $lib: SDK_PLATFORM });
    const tmaProps = this.identity.autoIdentify();
    if (tmaProps) {
      this.setProperties(tmaProps);
    }
  }

  identify(distinctId: string): void {
    this.identity.identify(distinctId);
  }

  override track<E extends EventName>(distinctId: DistinctId, event: E, ...args: TrackArgs<E>): void {
    if (this.consent.isOptedOut()) return;
    super.track(distinctId, event, ...args);
  }

  trackEvent(event: string, properties?: Record<string, unknown>): void {
    if (this.consent.isOptedOut()) return;
    const id = this.identity.getDistinctId();
    if (!id) return;
    this.track(id, event, properties);
  }

  setProperty(key: string, value: unknown): void {
    const id = this.identity.getDistinctId();
    if (!id) return;
    this.setUserProperty(id, key, value);
  }

  setProperties(properties: Record<string, unknown>): void {
    const id = this.identity.getDistinctId();
    if (!id) return;
    this.setUserProperties(id, properties);
  }

  optOut(): void {
    this.consent.optOut();
  }

  optIn(): void {
    this.consent.optIn();
  }

  isOptedOut(): boolean {
    return this.consent.isOptedOut();
  }

  protected createTransport(config: ResolvedConfig): ITransport {
    return new FetchTransport(config.endpoint, config.requestTimeout);
  }

  protected createQueue(config: ResolvedConfig): IEventQueue {
    return new PersistentQueue({
      maxSize: config.maxQueueSize,
      storageKey: storageKey('queue'),
    });
  }

  protected createLogger(config: ResolvedConfig): ILogger {
    return config.debug ? new ConsoleLogger() : new NoopLogger();
  }

  protected registerLifecycleHandlers(): void {
    this.lifecycle = new PageLifecycleManager(() => void this.flush());
    this.lifecycle.register();
  }

  protected unregisterLifecycleHandlers(): void {
    this.lifecycle?.unregister();
    this.lifecycle = null;
  }
}
