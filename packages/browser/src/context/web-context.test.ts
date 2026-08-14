import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { collectWebProperties } from './web-context.js';

const setUserAgent = (value: string): void => {
  Object.defineProperty(window.navigator, 'userAgent', { value, configurable: true });
};

const setReferrer = (value: string): void => {
  Object.defineProperty(window.document, 'referrer', { value, configurable: true });
};

describe('collectWebProperties', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, '', '/pricing?plan=pro');
  });

  afterEach(() => {
    setReferrer('');
  });

  it('collects page, screen and locale properties', () => {
    const props = collectWebProperties();

    expect(props.$current_url).toBe(window.location.href);
    expect(props.$pathname).toBe('/pricing');
    expect(props.$screen_width).toBe(window.screen.width);
    expect(props.$screen_height).toBe(window.screen.height);
    expect(props.$viewport_width).toBe(window.innerWidth);
    expect(props.$viewport_height).toBe(window.innerHeight);
    expect(props.$browser_language).toBe(navigator.language);
    expect(props.$timezone).toBeTruthy();
  });

  it('marks a visit without a referrer as direct', () => {
    const props = collectWebProperties();

    expect(props.$referrer).toBe('$direct');
    expect(props.$referring_domain).toBe('$direct');
  });

  it('extracts the referring domain', () => {
    setReferrer('https://news.example.com/article?id=1');

    const props = collectWebProperties();

    expect(props.$referrer).toBe('https://news.example.com/article?id=1');
    expect(props.$referring_domain).toBe('news.example.com');
  });

  it('detects the device type from the user agent', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148');
    expect(collectWebProperties().$device_type).toBe('Mobile');

    setUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Mobile/15E148');
    expect(collectWebProperties().$device_type).toBe('Tablet');

    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36');
    expect(collectWebProperties().$device_type).toBe('Desktop');
  });

  it('includes the campaign tags of the session', () => {
    window.history.replaceState({}, '', '/?utm_source=telegram&utm_campaign=launch');

    expect(collectWebProperties()).toMatchObject({
      utm_source: 'telegram',
      utm_campaign: 'launch',
    });
  });
});
