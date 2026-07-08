import { createHmac, timingSafeEqual } from 'node:crypto';

const OFFER_PREFIX = 'of_';
const PAYLOAD_LEN = 21;
const SIG_LEN = 16;
const OFFER_VERSION = 0x02;

export interface OfferResult {
  percent: number;
  appliesTo: number;
  expiresAt: number;
  telegramId: bigint;
  templateIdHash: string;
}

/**
 * Verify an offer token entirely offline — no calls to Push Hub.
 *
 * Two independent keys guard the flow: the bot token authenticates *who* the
 * user is (via Telegram-signed initData → `authedUserId`), and the per-app
 * offer `secret` authenticates that the *offer terms* were not tampered with.
 *
 * @param token        the `of_...` string (e.g. from `initDataUnsafe.start_param`)
 * @param secret       per-app offer secret (Developer Settings → Push secret)
 * @param authedUserId telegram id from *verified* initData (number | string | bigint)
 * @param now          unix seconds; defaults to current time
 * @returns the offer on success, or `null` if invalid/expired/not-the-recipient
 */
export function decodeAndVerifyOffer(
  token: string,
  secret: string,
  authedUserId: number | string | bigint,
  now: number = Math.floor(Date.now() / 1000),
): OfferResult | null {
  if (typeof token !== 'string' || !token.startsWith(OFFER_PREFIX)) return null;

  let raw: Buffer;
  try {
    raw = Buffer.from(token.slice(OFFER_PREFIX.length), 'base64url');
  } catch {
    return null;
  }
  if (raw.length < PAYLOAD_LEN + SIG_LEN) return null;

  const payload = raw.subarray(0, PAYLOAD_LEN);
  const sig = raw.subarray(PAYLOAD_LEN, PAYLOAD_LEN + SIG_LEN);

  const expected = createHmac('sha256', secret).update(payload).digest().subarray(0, SIG_LEN);
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;

  if (payload.readUInt8(0) !== OFFER_VERSION) return null;

  const expiresAt = payload.readUInt32BE(3);
  if (expiresAt < now) return null;

  const telegramId = payload.readBigUInt64BE(7);
  let authed: bigint;
  try {
    authed = BigInt(authedUserId);
  } catch {
    return null;
  }
  if (telegramId !== authed) return null;

  return {
    percent: payload.readUInt8(1),
    appliesTo: payload.readUInt8(2),
    expiresAt,
    telegramId,
    templateIdHash: payload.subarray(15, 21).toString('hex'),
  };
}
