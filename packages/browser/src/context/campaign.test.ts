import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ILogger } from '@appss/sdk-core';
import { resolveCampaignProperties } from './campaign.js';

const testLogger = (): ILogger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const CAMPAIGN_KEY = '__appss_campaign';

const navigateTo = (search: string): void => {
  window.history.replaceState({}, '', `/landing${search}`);
};

describe('resolveCampaignProperties', () => {
  beforeEach(() => {
    sessionStorage.clear();
    navigateTo('');
  });

  it('returns no properties when the URL has no campaign tags', () => {
    expect(resolveCampaignProperties()).toEqual({});
  });

  it('reads campaign tags from the URL', () => {
    navigateTo('?utm_source=telegram&utm_medium=cpc&utm_campaign=launch');

    expect(resolveCampaignProperties()).toEqual({
      utm_source: 'telegram',
      utm_medium: 'cpc',
      utm_campaign: 'launch',
    });
  });

  it('keeps the tags for the whole session after the URL loses them', () => {
    navigateTo('?utm_source=telegram&utm_term=sdk&utm_content=banner');
    resolveCampaignProperties();

    navigateTo('/pricing');

    expect(resolveCampaignProperties()).toEqual({
      utm_source: 'telegram',
      utm_term: 'sdk',
      utm_content: 'banner',
    });
  });

  it('replaces stored tags when new ones arrive in the URL', () => {
    navigateTo('?utm_source=telegram');
    resolveCampaignProperties();

    navigateTo('?utm_source=google');

    expect(resolveCampaignProperties()).toEqual({ utm_source: 'google' });
    expect(sessionStorage.getItem(CAMPAIGN_KEY)).toBe(JSON.stringify({ utm_source: 'google' }));
  });

  it('ignores blank tag values', () => {
    navigateTo('?utm_source=%20&utm_medium=cpc');

    expect(resolveCampaignProperties()).toEqual({ utm_medium: 'cpc' });
  });

  it('returns no properties when the stored value is not valid JSON', () => {
    sessionStorage.setItem(CAMPAIGN_KEY, 'not-json');

    expect(resolveCampaignProperties()).toEqual({});
  });

  it('reports a broken stored value to the logger', () => {
    const logger = testLogger();
    sessionStorage.setItem(CAMPAIGN_KEY, 'not-json');

    resolveCampaignProperties(logger);

    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to read the stored campaign tags',
      expect.objectContaining({ error: expect.stringContaining('SyntaxError') as string }),
    );
  });

  it('reports a stored value of the wrong shape to the logger', () => {
    const logger = testLogger();
    sessionStorage.setItem(CAMPAIGN_KEY, '"utm_source=telegram"');

    expect(resolveCampaignProperties(logger)).toEqual({});
    expect(logger.warn).toHaveBeenCalledWith('Stored campaign tags are not an object', {
      raw: '"utm_source=telegram"',
    });
  });
});
