export type DistinctId = string | number;

export function resolveDistinctId(distinctId: DistinctId): string | null {
  if (typeof distinctId === 'number') {
    if (!Number.isFinite(distinctId)) return null;
    return String(distinctId);
  }
  if (!distinctId || distinctId.trim().length === 0) return null;
  return distinctId;
}
