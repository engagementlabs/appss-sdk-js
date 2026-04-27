const MAX_BEACON_BYTES = 63_000;

interface BatchPayload {
  batch: unknown[];
}

function isBatchPayload(payload: unknown): payload is BatchPayload {
  return typeof payload === 'object' && payload !== null && Array.isArray((payload as BatchPayload).batch);
}

export function sendViaBeacon(url: string, payload: unknown): boolean {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false;

  const json = JSON.stringify(payload);

  if (json.length <= MAX_BEACON_BYTES) {
    const blob = new Blob([json], { type: 'application/json' });
    return navigator.sendBeacon(url, blob);
  }

  if (!isBatchPayload(payload) || payload.batch.length <= 1) {
    const blob = new Blob([json], { type: 'application/json' });
    return navigator.sendBeacon(url, blob);
  }

  const mid = Math.ceil(payload.batch.length / 2);
  const ok1 = sendViaBeacon(url, { ...payload, batch: payload.batch.slice(0, mid) });
  const ok2 = sendViaBeacon(url, { ...payload, batch: payload.batch.slice(mid) });
  return ok1 && ok2;
}
