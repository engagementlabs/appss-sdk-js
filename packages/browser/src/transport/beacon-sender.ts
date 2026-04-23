const MAX_BEACON_BYTES = 63_000;

export function sendViaBeacon(url: string, payload: unknown): boolean {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false;

  const json = JSON.stringify(payload);

  if (json.length <= MAX_BEACON_BYTES) {
    const blob = new Blob([json], { type: 'application/json' });
    return navigator.sendBeacon(url, blob);
  }

  const batch = (payload as { batch?: unknown[] }).batch;
  if (!Array.isArray(batch) || batch.length <= 1) {
    const blob = new Blob([json], { type: 'application/json' });
    return navigator.sendBeacon(url, blob);
  }

  const mid = Math.ceil(batch.length / 2);
  const first = { ...payload as Record<string, unknown>, batch: batch.slice(0, mid) };
  const second = { ...payload as Record<string, unknown>, batch: batch.slice(mid) };

  const ok1 = sendViaBeacon(url, first);
  const ok2 = sendViaBeacon(url, second);
  return ok1 && ok2;
}
