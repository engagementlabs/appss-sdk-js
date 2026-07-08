/** The dict a Push Hub webhook POSTs to the app's endpoint. */
export interface WebhookPushPayload {
  push_id?: string;
  template_id?: string;
  step_id?: string;
  app_id?: number;
  recipient?: { telegram_id?: number | string; distinct_id?: string };
  message?: { text?: string; parse_mode?: string; reply_markup?: unknown };
}
