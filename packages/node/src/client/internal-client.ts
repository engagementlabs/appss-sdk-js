import {
  AbstractAppssClient,
  type AppssConfig,
  type ResolvedConfig,
  type ITransport,
  type IEventQueue,
  type ILogger,
} from '@appss/sdk-core';

import { SDK_PLATFORM } from '../constants.js';

import { NodeTransport } from '../transport/node-transport.js';
import { MemoryQueue } from '../queue/memory-queue.js';
import { NodeLogger, NoopLogger } from '../logger/node-logger.js';
import { ShutdownHandler } from '../lifecycle/shutdown-handler.js';

export class NodeInternalClient extends AbstractAppssClient {
  private shutdown: ShutdownHandler | null = null;

  override init(config: AppssConfig): void {
    super.init(config);
    this.setSuperProperties({ $lib: SDK_PLATFORM });
  }

  protected createTransport(config: ResolvedConfig): ITransport {
    return new NodeTransport(config.endpoint, config.requestTimeout);
  }

  protected createQueue(config: ResolvedConfig): IEventQueue {
    return new MemoryQueue({ maxSize: config.maxQueueSize });
  }

  protected createLogger(config: ResolvedConfig): ILogger {
    return config.debug ? new NodeLogger() : new NoopLogger();
  }

  protected registerLifecycleHandlers(): void {
    this.shutdown = new ShutdownHandler();
    this.shutdown.register(() => this.flush());
  }

  protected unregisterLifecycleHandlers(): void {
    this.shutdown?.unregister();
    this.shutdown = null;
  }
}
