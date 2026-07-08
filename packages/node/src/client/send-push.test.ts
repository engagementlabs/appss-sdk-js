import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAppss } from './node-client.js';
import { NodeInternalClient } from './internal-client.js';
import { PushSender } from '../push/push-sender.js';
import type { TelegramSender, SendOutcome } from '../transport/telegram-sender.js';

function payload(overrides: Record<string, unknown> = {}) {
  return {
    push_id: 'pid-1',
    template_id: 'tmpl-1',
    step_id: 'step-1',
    app_id: 7,
    recipient: { telegram_id: 12345, distinct_id: '12345' },
    message: {
      text: 'hello',
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: 'x', url: 'https://a' }]] },
    },
    ...overrides,
  };
}

function isTelegram(url: string): boolean {
  return url.includes('api.telegram.org');
}

interface PushEventRow {
  event: string;
  $insert_id: string;
  distinct_id: string;
  properties: Record<string, unknown>;
}

function pushEventBodies(): PushEventRow[] {
  const out: PushEventRow[] = [];
  for (const c of vi.mocked(fetch).mock.calls) {
    if (String(c[0]).includes('/api/v1/push-events')) {
      const body = JSON.parse(String((c[1] as RequestInit)?.body)) as { batch: PushEventRow[] };
      out.push(...body.batch);
    }
  }
  return out;
}

function firstPushEvent(): PushEventRow {
  const [row] = pushEventBodies();
  if (!row) throw new Error('expected at least one push event');
  return row;
}

describe('AppssNodeClient.sendPush', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BOT_TOKEN;
  });

  it('sends via Bot API and emits Push Sent to push_events', async () => {
    process.env.BOT_TOKEN = 'tok-123';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        const tg = isTelegram(String(url));
        return Promise.resolve({
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () =>
            Promise.resolve(tg ? { ok: true, result: { message_id: 99 } } : { accepted: 1 }),
        });
      }),
    );

    const client = createAppss({ apiKey: 'key' });
    const outcome = await client.sendPush(payload());

    expect(outcome.ok).toBe(true);
    expect(outcome.tgMessageId).toBe(99);

    const tgCall = vi.mocked(fetch).mock.calls.find((c) => isTelegram(String(c[0])));
    expect(tgCall).toBeTruthy();
    expect(String(tgCall?.[0])).toContain('/bottok-123/sendMessage');
    const tgBody = JSON.parse(String((tgCall?.[1] as RequestInit)?.body));
    expect(tgBody.chat_id).toBe(12345);
    expect(tgBody.text).toBe('hello');
    expect(tgBody.parse_mode).toBe('HTML');

    const events = pushEventBodies();
    expect(events).toHaveLength(1);
    const event = firstPushEvent();
    expect(event.event).toBe('Push Sent');
    expect(event.$insert_id).toBe('pid-1');
    expect(event.distinct_id).toBe('12345');
    expect(event.properties.transport).toBe('telegram');
    expect(event.properties.source).toBe('sdk');
    expect(event.properties.tg_message_id).toBe('99');
    expect(event.properties.reason).toBeUndefined();
  });

  it('without BOT_TOKEN emits Push Failed and never calls Bot API', async () => {
    delete process.env.BOT_TOKEN;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ accepted: 1 }),
      }),
    );

    const client = createAppss({ apiKey: 'key' });
    const outcome = await client.sendPush(payload());

    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe('no_token');
    expect(vi.mocked(fetch).mock.calls.some((c) => isTelegram(String(c[0])))).toBe(false);

    const event = firstPushEvent();
    expect(event.event).toBe('Push Failed');
    expect(event.properties.reason).toBe('no_token');
  });

  it('terminal Bot API failure emits Push Failed without retry', async () => {
    process.env.BOT_TOKEN = 'tok-123';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        const tg = isTelegram(String(url));
        return Promise.resolve({
          status: tg ? 403 : 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () =>
            Promise.resolve(
              tg
                ? { ok: false, description: 'Forbidden: bot was blocked by the user' }
                : { accepted: 1 },
            ),
        });
      }),
    );

    const client = createAppss({ apiKey: 'key' });
    const outcome = await client.sendPush(payload());

    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe('blocked');
    const tgCalls = vi.mocked(fetch).mock.calls.filter((c) => isTelegram(String(c[0])));
    expect(tgCalls).toHaveLength(1);

    const event = firstPushEvent();
    expect(event.event).toBe('Push Failed');
    expect(event.properties.reason).toBe('blocked');
  });
});

class FakeSender {
  calls = 0;
  constructor(private readonly outcomes: SendOutcome[]) {}
  async sendMessage(): Promise<SendOutcome> {
    const idx = Math.min(this.calls, this.outcomes.length - 1);
    this.calls += 1;
    return this.outcomes[idx] ?? { ok: false, reason: 'network' };
  }
}

describe('NodeInternalClient.sendPush retries', () => {
  beforeEach(() => {
    process.env.BOT_TOKEN = 'tok-123';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ accepted: 1 }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BOT_TOKEN;
  });

  it('retries transient failures then gives up (1 + 3 attempts)', async () => {
    const client = new NodeInternalClient();
    client.init({ apiKey: 'key' });
    const sender = new FakeSender([{ ok: false, reason: 'network' }]);
    client.pushSender = new PushSender(sender as unknown as TelegramSender, () => Promise.resolve());

    const outcome = await client.sendPush(payload());

    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe('network');
    expect(sender.calls).toBe(4);

    await client.destroy();
  });

  it('retries then succeeds', async () => {
    const client = new NodeInternalClient();
    client.init({ apiKey: 'key' });
    const sender = new FakeSender([
      { ok: false, reason: 'throttled', retryAfter: 1 },
      { ok: true, tgMessageId: 7 },
    ]);
    client.pushSender = new PushSender(sender as unknown as TelegramSender, () => Promise.resolve());

    const outcome = await client.sendPush(payload());

    expect(outcome.ok).toBe(true);
    expect(sender.calls).toBe(2);

    await client.destroy();
  });
});
