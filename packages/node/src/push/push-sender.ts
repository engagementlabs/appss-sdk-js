import { TelegramSender, type SendOutcome } from '../transport/telegram-sender.js';
import {
  PUSH_SEND_MAX_RETRIES,
  PUSH_SEND_BACKOFF_MS,
  PUSH_SEND_MAX_BACKOFF_MS,
  RETRYABLE_SEND_REASONS,
} from '../constants.js';

export interface PushSendParams {
  token: string;
  chatId: number;
  text: string;
  parseMode?: string;
  replyMarkup?: unknown;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Delivers a single Telegram message, retrying transient failures with
 * exponential backoff (honouring Telegram's `retry_after` on throttling).
 *
 * Owns the *transport* concern only — it knows nothing about analytics events
 * or webhook payloads; the caller feeds it an already-resolved destination.
 */
export class PushSender {
  constructor(
    private readonly sender: TelegramSender = new TelegramSender(),
    private readonly sleep: (ms: number) => Promise<void> = defaultSleep,
  ) {}

  async send({ token, chatId, text, parseMode, replyMarkup }: PushSendParams): Promise<SendOutcome> {
    let attempt = 0;
    for (;;) {
      const outcome = await this.sender.sendMessage(token, chatId, text, parseMode, replyMarkup);
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
      await this.sleep(delayMs);
      attempt += 1;
    }
  }
}
