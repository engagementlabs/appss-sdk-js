import {
  AbstractAppssClient,
  type AppssConfig,
  type ResolvedConfig,
  type ITransport,
  type IEventQueue,
  type ILogger,
  PUSH_EVENTS_PATH,
  PUSH_SENT_EVENT,
  PUSH_FAILED_EVENT,
} from '@appss/sdk-core';

import {
  SDK_PLATFORM,
  BOT_TOKEN_ENV,
  PUSH_SEND_MAX_RETRIES,
  PUSH_SEND_BACKOFF_MS,
  PUSH_SEND_MAX_BACKOFF_MS,
  PUSH_TRANSPORT_TELEGRAM,
  PUSH_SOURCE_SDK,
  RETRYABLE_SEND_REASONS,
} from '../constants.js';

import { NodeTransport } from '../transport/node-transport.js';
import { TelegramSender, type SendOutcome } from '../transport/telegram-sender.js';
import { MemoryQueue } from '../queue/memory-queue.js';
import { NodeLogger, NoopLogger } from '../logger/node-logger.js';
import { ShutdownHandler } from '../lifecycle/shutdown-handler.js';

/** The dict a Push Hub webhook POSTs to the app's endpoint. */
export interface WebhookPushPayload {
  push_id?: string;
  template_id?: string;
  step_id?: string;
  app_id?: number;
  recipient?: { telegram_id?: number | string; distinct_id?: string };
  message?: { text?: string; parse_mode?: string; reply_markup?: unknown };
}

export class NodeInternalClient extends AbstractAppssClient {
  private shutdown: ShutdownHandler | null = null;
  /** Telegram Bot API client for sendPush(); overridable in tests. */
  telegramSender: TelegramSender = new TelegramSender();
  /** Backoff sleep; overridable in tests. */
  private sleepImpl: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  override init(config: AppssConfig): void {
    super.init(config);
    this.setSuperProperties({ $lib: SDK_PLATFORM });
  }

  async sendPush(payload: WebhookPushPayload): Promise<SendOutcome> {
    const recipient = payload.recipient ?? {};
    const message = payload.message ?? {};
    const pushId = String(payload.push_id ?? '');
    const templateId = String(payload.template_id ?? '');
    const stepId = String(payload.step_id ?? '');
    const distinctId = String(recipient.distinct_id ?? '');
    const text = message.text ?? '';
    const parseMode = message.parse_mode;
    const replyMarkup = message.reply_markup;

    const chatIdNum = Number(recipient.telegram_id);
    const chatId = Number.isInteger(chatIdNum) ? chatIdNum : null;

    const fail = async (reason: string): Promise<SendOutcome> => {
      await this.emitPushEvent(PUSH_FAILED_EVENT, distinctId, pushId, templateId, stepId, { reason });
      return { ok: false, reason };
    };

    const token = (process.env[BOT_TOKEN_ENV] ?? '').trim();
    if (!token) return fail('no_token');
    if (chatId === null) return fail('no_telegram_id');
    if (!text) return fail('empty_content');

    const outcome = await this.sendWithRetries(token, chatId, text, parseMode, replyMarkup);
    if (outcome.ok) {
      await this.emitPushEvent(PUSH_SENT_EVENT, distinctId, pushId, templateId, stepId, {
        tgMessageId: outcome.tgMessageId,
      });
    } else {
      await this.emitPushEvent(PUSH_FAILED_EVENT, distinctId, pushId, templateId, stepId, {
        reason: outcome.reason,
      });
    }
    return outcome;
  }

  private async sendWithRetries(
    token: string,
    chatId: number,
    text: string,
    parseMode: string | undefined,
    replyMarkup: unknown,
  ): Promise<SendOutcome> {
    let attempt = 0;
    for (;;) {
      const outcome = await this.telegramSender.sendMessage(token, chatId, text, parseMode, replyMarkup);
      if (
        outcome.ok ||
        !RETRYABLE_SEND_REASONS.has(outcome.reason ?? '') ||
        attempt >= PUSH_SEND_MAX_RETRIES
      ) {
        return outcome;
      }
      const delayMs =
        outcome.reason === 'throttled' && outcome.retryAfter
          ? outcome.retryAfter * 1000
          : Math.min(PUSH_SEND_BACKOFF_MS * 2 ** attempt, PUSH_SEND_MAX_BACKOFF_MS);
      await this.sleepImpl(delayMs);
      attempt += 1;
    }
  }

  private async emitPushEvent(
    event: string,
    distinctId: string,
    pushId: string,
    templateId: string,
    stepId: string,
    opts: { tgMessageId?: number; reason?: string } = {},
  ): Promise<void> {
    const properties: Record<string, unknown> = {
      push_id: pushId,
      template_id: templateId,
      step_id: stepId,
      transport: PUSH_TRANSPORT_TELEGRAM,
      source: PUSH_SOURCE_SDK,
    };
    if (opts.tgMessageId !== undefined && opts.tgMessageId !== null) {
      properties.tg_message_id = String(opts.tgMessageId);
    }
    if (opts.reason !== undefined) {
      properties.reason = opts.reason;
    }

    const body = {
      batch: [
        {
          event,
          distinct_id: distinctId,
          $insert_id: pushId,
          timestamp: new Date().toISOString(),
          properties,
        },
      ],
    };
    await this.dispatchImmediate(PUSH_EVENTS_PATH, body);
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
