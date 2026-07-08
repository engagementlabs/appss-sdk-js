import type { AppssConfig } from '@appss/sdk-core';

export interface NodeAppssConfig extends AppssConfig {
  /**
   * Telegram Bot API token used by `sendPush()`.
   *
   * When omitted, falls back to `process.env.BOT_TOKEN` for backwards
   * compatibility, but passing it explicitly is preferred.
   */
  botToken?: string;
}
