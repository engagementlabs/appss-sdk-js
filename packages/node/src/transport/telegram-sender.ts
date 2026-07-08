import { TELEGRAM_API_BASE, PUSH_SEND_TIMEOUT_MS } from '../constants.js';

export interface SendOutcome {
  ok: boolean;
  tgMessageId?: number;
  reason?: string;
  retryAfter?: number;
}

function classify(statusCode: number, description: string): string {
  const desc = description.toLowerCase();
  if (statusCode === 429) return 'throttled';
  if (statusCode >= 500 && statusCode < 600) return 'server_error';
  if (statusCode === 401) return 'token_revoked';
  if (statusCode === 403) return desc.includes('blocked') ? 'blocked' : 'forbidden';
  return 'bad_request';
}

export class TelegramSender {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(baseUrl: string = TELEGRAM_API_BASE, timeoutMs: number = PUSH_SEND_TIMEOUT_MS) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  async sendMessage(
    token: string,
    chatId: number,
    text: string,
    parseMode?: string,
    replyMarkup?: unknown,
  ): Promise<SendOutcome> {
    const body: Record<string, unknown> = { chat_id: chatId, text };
    if (parseMode) body.parse_mode = parseMode;
    if (replyMarkup) body.reply_markup = replyMarkup;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      return { ok: false, reason: 'network' };
    } finally {
      clearTimeout(timeoutId);
    }

    type TelegramResponse = {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
      parameters?: { retry_after?: number };
    };
    let payload: TelegramResponse;
    try {
      payload = (await response.json()) as TelegramResponse;
    } catch {
      payload = {};
    }

    if (response.status === 200 && payload.ok) {
      return { ok: true, tgMessageId: payload.result?.message_id };
    }

    const reason = classify(response.status, payload.description ?? '');
    const retryAfter =
      typeof payload.parameters?.retry_after === 'number'
        ? payload.parameters.retry_after
        : undefined;
    return { ok: false, reason, retryAfter };
  }
}
