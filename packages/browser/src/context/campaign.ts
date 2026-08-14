import { storageKey, type ILogger } from '@appss/sdk-core';
import type { CampaignParam, CampaignProperties } from '../types/context.js';

const CAMPAIGN_KEY = storageKey('campaign');

const CAMPAIGN_PARAMS: readonly CampaignParam[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
];

function readFromUrl(logger?: ILogger | null): CampaignProperties {
  const properties: CampaignProperties = {};

  try {
    const params = new URLSearchParams(window.location.search);
    for (const name of CAMPAIGN_PARAMS) {
      const value = params.get(name)?.trim();
      if (value) properties[name] = value;
    }
  } catch (error) {
    logger?.warn('Failed to read campaign tags from the URL', { error: String(error) });
  }

  return properties;
}

function load(logger?: ILogger | null): CampaignProperties {
  try {
    const raw = sessionStorage.getItem(CAMPAIGN_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      logger?.warn('Stored campaign tags are not an object', { raw });
      return {};
    }

    return parsed as CampaignProperties;
  } catch (error) {
    logger?.warn('Failed to read the stored campaign tags', { error: String(error) });
    return {};
  }
}

function save(properties: CampaignProperties, logger?: ILogger | null): void {
  try {
    sessionStorage.setItem(CAMPAIGN_KEY, JSON.stringify(properties));
  } catch (error) {
    logger?.warn('Failed to store the campaign tags', { error: String(error) });
  }
}

export function resolveCampaignProperties(logger?: ILogger | null): CampaignProperties {
  const fromUrl = readFromUrl(logger);

  if (Object.keys(fromUrl).length > 0) {
    save(fromUrl, logger);
    return fromUrl;
  }

  return load(logger);
}
