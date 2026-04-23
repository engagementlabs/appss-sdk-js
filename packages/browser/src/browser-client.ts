import {
  AbstractAppssClient,
  storageKey,
  type AppssConfig,
  type ResolvedConfig,
  type ITransport,
  type IEventQueue,
  type ILogger,
} from '@appss/sdk-core';

import { FetchTransport } from './transport/fetch-transport.js';
import { PersistentQueue } from './queue/persistent-queue.js';
import { ConsoleLogger } from './logger/console-logger.js';
import { NoopLogger } from './logger/noop-logger.js';
import { PageLifecycleManager } from './lifecycle/page-lifecycle.js';
import { extractTmaUser, extractTmaProperties } from './identity/tma-context.js';
import { getOrCreateAnonymousId } from './identity/anonymous-id.js';

export class BrowserAppssClient extends AbstractAppssClient {
  private lifecycle: PageLifecycleManager | null = null;

  override init(config: AppssConfig): void {
    super.init(config);
    this.autoIdentify();
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

  private autoIdentify(): void {
    const tmaUser = extractTmaUser();

    if (tmaUser) {
      this.identify(String(tmaUser.id));
      this.setUserProperties(extractTmaProperties());
      void this.flushUserProperties();
      return;
    }

    const anonymousId = getOrCreateAnonymousId();
    this.identify(anonymousId);
  }
}
