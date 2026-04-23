import type { AppssEvent, EventPayload } from '../../shared/types/wire-protocol.js';
import type { BuildEventParams } from '../../shared/types/internal.js';

export function buildEvent(params: BuildEventParams): AppssEvent {
  if (!params.event || params.event.trim().length === 0) {
    throw new Error('Event name is required and cannot be empty.');
  }

  return {
    event: params.event,
    distinctId: params.distinctId,
    insertId: crypto.randomUUID(),
    timestamp: new Date(),
    properties: params.properties,
  };
}

export function eventToPayload(event: AppssEvent): EventPayload {
  const payload: EventPayload = {
    event: event.event,
    distinct_id: event.distinctId,
    $insert_id: event.insertId,
    timestamp: event.timestamp.toISOString(),
  };

  if (event.properties && Object.keys(event.properties).length > 0) {
    payload.properties = event.properties;
  }

  return payload;
}
