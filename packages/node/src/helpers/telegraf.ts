import { extractFrom, buildProperties, extractStartParam, type ExtractedContext } from './extract.js';

export function fromTelegrafContext(ctx: unknown): ExtractedContext | null {
  const c = ctx as Record<string, unknown> | null;
  if (!c) return null;

  const from = extractFrom(c);
  if (!from) return null;

  const props = buildProperties(from, c);
  const startParam = extractStartParam(c);
  if (startParam) props['$start_param'] = startParam;

  return { distinctId: String(from['id']), properties: props };
}
