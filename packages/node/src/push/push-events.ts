import { PUSH_TRANSPORT_TELEGRAM, PUSH_SOURCE_SDK } from '../constants.js';

/** Identifies the push a lifecycle event belongs to. */
export interface PushEventContext {
  distinctId: string;
  pushId: string;
  templateId: string;
  stepId: string;
}

/** Outcome-specific fields folded into the event's properties. */
export interface PushEventDetails {
  tgMessageId?: number;
  reason?: string;
}

/** A single-row batch ready to POST to the push-events endpoint. */
export interface PushEventBody {
  batch: Array<{
    event: string;
    distinct_id: string;
    $insert_id: string;
    timestamp: string;
    properties: Record<string, unknown>;
  }>;
}

/**
 * Builds the analytics payload for a `Push Sent` / `Push Failed` event.
 *
 * Pure and transport-agnostic: it produces the body, the client dispatches it.
 */
export function buildPushEventBody(
  event: string,
  ctx: PushEventContext,
  details: PushEventDetails = {},
): PushEventBody {
  const properties: Record<string, unknown> = {
    push_id: ctx.pushId,
    template_id: ctx.templateId,
    step_id: ctx.stepId,
    transport: PUSH_TRANSPORT_TELEGRAM,
    source: PUSH_SOURCE_SDK,
  };
  if (details.tgMessageId !== undefined && details.tgMessageId !== null) {
    properties.tg_message_id = String(details.tgMessageId);
  }
  if (details.reason !== undefined) {
    properties.reason = details.reason;
  }

  return {
    batch: [
      {
        event,
        distinct_id: ctx.distinctId,
        $insert_id: ctx.pushId,
        timestamp: new Date().toISOString(),
        properties,
      },
    ],
  };
}
