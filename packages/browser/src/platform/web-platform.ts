import type { ILogger } from '@appss/sdk-core';

import type { Platform } from './platform.js';
import { collectWebProperties } from '../context/web-context.js';

export class WebPlatform implements Platform {
  readonly name = 'web';

  isAvailable(): boolean {
    return true;
  }

  getUserId(): string | null {
    return null;
  }

  getProperties(): Record<string, unknown> {
    return {};
  }

  getEventContext(logger?: ILogger | null): Record<string, unknown> {
    return collectWebProperties(logger);
  }
}
