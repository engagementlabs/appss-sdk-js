import type { ResolvedConfig } from '../../shared/types/config.js';
import { SDK_NAME, SDK_VERSION, PROTOCOL_VERSION } from '../../shared/constants.js';

export function buildHeaders(config: ResolvedConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    'X-Appss-Sdk': `${SDK_NAME}/${SDK_VERSION}`,
    'X-Appss-Protocol-Version': PROTOCOL_VERSION,
  };
}
