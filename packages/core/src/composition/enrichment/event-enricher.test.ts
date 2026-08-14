import { describe, it, expect } from 'vitest';
import { EventEnricher } from './event-enricher.js';

describe('EventEnricher', () => {
  it('enriches with a single property via set()', () => {
    const enricher = new EventEnricher();
    enricher.set('$lib', 'browser');

    expect(enricher.enrich({ foo: 'bar' })).toEqual({ foo: 'bar', $lib: 'browser' });
  });

  it('enriches with multiple properties via setAll()', () => {
    const enricher = new EventEnricher();
    enricher.setAll({ $lib: 'node', $version: '1.0' });

    expect(enricher.enrich()).toEqual({ $lib: 'node', $version: '1.0' });
  });

  it('returns empty object when no metadata and no properties', () => {
    const enricher = new EventEnricher();
    expect(enricher.enrich()).toEqual({});
  });

  it('event properties override super properties', () => {
    const enricher = new EventEnricher();
    enricher.set('$lib', 'browser');

    expect(enricher.enrich({ $lib: 'user-set' })['$lib']).toBe('user-set');
  });

  it('preserves all original event properties', () => {
    const enricher = new EventEnricher();
    enricher.set('$lib', 'node');

    expect(enricher.enrich({ a: 1, b: 'two', c: true })).toEqual({
      a: 1, b: 'two', c: true, $lib: 'node',
    });
  });

  it('accumulates properties across multiple set() calls', () => {
    const enricher = new EventEnricher();
    enricher.set('$lib', 'browser');
    enricher.set('env', 'production');

    expect(enricher.enrich()).toEqual({ $lib: 'browser', env: 'production' });
  });

  it('remove() deletes a single property', () => {
    const enricher = new EventEnricher();
    enricher.setAll({ $lib: 'browser', env: 'prod' });
    enricher.remove('env');

    expect(enricher.enrich()).toEqual({ $lib: 'browser' });
  });

  it('reset() clears all properties', () => {
    const enricher = new EventEnricher();
    enricher.setAll({ $lib: 'browser', env: 'prod', version: '1.0' });
    enricher.reset();

    expect(enricher.enrich()).toEqual({});
  });

  it('reset() does not affect subsequent set() calls', () => {
    const enricher = new EventEnricher();
    enricher.set('$lib', 'browser');
    enricher.reset();
    enricher.set('$lib', 'node');

    expect(enricher.enrich()).toEqual({ $lib: 'node' });
  });

  it('enriches with the context provider', () => {
    const enricher = new EventEnricher();
    enricher.setContextProvider(() => ({ $current_url: '/pricing' }));

    expect(enricher.enrich({ plan: 'pro' })).toEqual({ $current_url: '/pricing', plan: 'pro' });
  });

  it('collects the context on every event', () => {
    const enricher = new EventEnricher();
    let page = '/pricing';
    enricher.setContextProvider(() => ({ $current_url: page }));

    expect(enricher.enrich()['$current_url']).toBe('/pricing');
    page = '/checkout';
    expect(enricher.enrich()['$current_url']).toBe('/checkout');
  });

  it('event properties override the context', () => {
    const enricher = new EventEnricher();
    enricher.setContextProvider(() => ({ $current_url: '/pricing' }));

    expect(enricher.enrich({ $current_url: '/custom' })['$current_url']).toBe('/custom');
  });

  it('the context overrides super properties', () => {
    const enricher = new EventEnricher();
    enricher.setContextProvider(() => ({ $lib: 'context' }));
    enricher.set('$lib', 'browser');

    expect(enricher.enrich()['$lib']).toBe('context');
  });

  it('ignores a context provider that throws', () => {
    const enricher = new EventEnricher();
    enricher.setContextProvider(() => {
      throw new Error('no window');
    });

    expect(enricher.enrich({ plan: 'pro' })).toEqual({ plan: 'pro' });
  });

  it('reset() keeps the context provider', () => {
    const enricher = new EventEnricher();
    enricher.setContextProvider(() => ({ $current_url: '/pricing' }));
    enricher.setAll({ $lib: 'browser' });
    enricher.reset();

    expect(enricher.enrich()).toEqual({ $current_url: '/pricing' });
  });

  it('setContextProvider(null) stops the collection', () => {
    const enricher = new EventEnricher();
    enricher.setContextProvider(() => ({ $current_url: '/pricing' }));
    enricher.setContextProvider(null);

    expect(enricher.enrich()).toEqual({});
  });
});
