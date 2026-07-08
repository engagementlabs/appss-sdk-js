import {
  AbstractAppssClient,
  type ResolvedConfig,
  type ITransport,
  type IEventQueue,
  type ILogger,
  PUSH_EVENTS_PATH,
  PUSH_SENT_EVENT,
  PUSH_FAILED_EVENT,
} from '@appss/sdk-core';

import { SDK_PLATFORM, BOT_TOKEN_ENV } from '../constants.js';

import { NodeTransport } from '../transport/node-transport.js';
import type { SendOutcome } from '../transport/telegram-sender.js';
import { PushSender } from '../push/push-sender.js';
import { buildPushEventBody, type PushEventContext } from '../push/push-events.js';
import type { WebhookPushPayload } from '../push/types.js';
import { MemoryQueue } from '../queue/memory-queue.js';
import { NodeLogger, NoopLogger } from '../logger/node-logger.js';
import { ShutdownHandler } from '../lifecycle/shutdown-handler.js';
import type { NodeAppssConfig } from './config.js';

export class NodeInternalClient extends AbstractAppssClient {
  private shutdown: ShutdownHandler | null = null;
  /** Bot token supplied via config; falls back to env when null. */
  private botToken: string | null = null;
  /** Telegram delivery with retry/backoff; overridable in tests. */
  pushSender: PushSender = new PushSender();

  override init(config: NodeAppssConfig): void {
    super.init(config);
    this.botToken = config.botToken?.trim() || null;
    this.setSuperProperties({ $lib: SDK_PLATFORM });
  }

  async sendPush(payload: WebhookPushPayload): Promise<SendOutcome> {
    const recipient = payload.recipient ?? {};
    const message = payload.message ?? {};
    const ctx: PushEventContext = {
      distinctId: String(recipient.distinct_id ?? ''),
      pushId: String(payload.push_id ?? ''),
      templateId: String(payload.template_id ?? ''),
      stepId: String(payload.step_id ?? ''),
    };
    const text = message.text ?? '';
    const parseMode = message.parse_mode;
    const replyMarkup = message.reply_markup;

    const chatIdNum = Number(recipient.telegram_id);
    const chatId = Number.isInteger(chatIdNum) ? chatIdNum : null;

    const fail = async (reason: string): Promise<SendOutcome> => {
      await this.emitPushEvent(PUSH_FAILED_EVENT, ctx, { reason });
      return { ok: false, reason };
    };

    const token = this.resolveToken();
    if (!token) return fail('no_token');
    if (chatId === null) return fail('no_telegram_id');
    if (!text) return fail('empty_content');

    const outcome = await this.pushSender.send({ token, chatId, text, parseMode, replyMarkup });
    if (outcome.ok) {
      await this.emitPushEvent(PUSH_SENT_EVENT, ctx, { tgMessageId: outcome.tgMessageId });
    } else {
      await this.emitPushEvent(PUSH_FAILED_EVENT, ctx, { reason: outcome.reason });
    }
    return outcome;
  }

  /** Config token wins; env var is a backwards-compatible fallback. */
  private resolveToken(): string {
    return this.botToken ?? (process.env[BOT_TOKEN_ENV] ?? '').trim();
  }

  private async emitPushEvent(
    event: string,
    ctx: PushEventContext,
    details: { tgMessageId?: number; reason?: string } = {},
  ): Promise<void> {
    await this.dispatchImmediate(PUSH_EVENTS_PATH, buildPushEventBody(event, ctx, details));
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
