import type { ILogger } from '@appss/sdk-core';

import { resolveCampaignProperties } from './campaign.js';
import { DIRECT_REFERRER } from '../constants.js';
import type { DeviceType, WebContextProperties } from '../types/context.js';

function detectDeviceType(userAgent: string): DeviceType {
  if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobi)/i.test(userAgent)) return 'Tablet';
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(userAgent)) return 'Mobile';
  return 'Desktop';
}

function extractReferringDomain(referrer: string, logger?: ILogger | null): string {
  try {
    return new URL(referrer).hostname || DIRECT_REFERRER;
  } catch (error) {
    logger?.warn('Failed to parse the referrer', { referrer, error: String(error) });
    return DIRECT_REFERRER;
  }
}

function resolveTimezone(logger?: ILogger | null): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    logger?.warn('Failed to resolve the timezone', { error: String(error) });
    return undefined;
  }
}

export function collectWebProperties(logger?: ILogger | null): WebContextProperties {
  const properties: WebContextProperties = resolveCampaignProperties(logger);

  try {
    properties.$current_url = window.location.href;
    properties.$pathname = window.location.pathname;

    const referrer = document.referrer;
    properties.$referrer = referrer || DIRECT_REFERRER;
    properties.$referring_domain = referrer
      ? extractReferringDomain(referrer, logger)
      : DIRECT_REFERRER;

    properties.$screen_width = window.screen.width;
    properties.$screen_height = window.screen.height;
    properties.$viewport_width = window.innerWidth;
    properties.$viewport_height = window.innerHeight;

    properties.$device_type = detectDeviceType(navigator.userAgent);
    properties.$browser_language = navigator.language;

    const timezone = resolveTimezone(logger);
    if (timezone) properties.$timezone = timezone;
  } catch (error) {
    logger?.warn('Failed to collect the web session properties', { error: String(error) });
  }

  return properties;
}
