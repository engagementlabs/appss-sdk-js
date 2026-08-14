import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ILogger } from '@appss/sdk-core';
import { BrowserIdentityManager } from './identity-manager.js';

const testLogger = (): ILogger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

describe('BrowserIdentityManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('issues a persistent anonymous ID when no platform provides one', () => {
    const identity = new BrowserIdentityManager();
    identity.start(null);

    expect(identity.getDistinctId()).toBe(localStorage.getItem('__appss_anonymous_id'));
  });

  it('prefers the platform ID over an anonymous one', () => {
    const identity = new BrowserIdentityManager();
    identity.start('42');

    expect(identity.getDistinctId()).toBe('42');
    expect(localStorage.getItem('__appss_anonymous_id')).toBeNull();
  });

  it('reports the previous ID when the account is identified', () => {
    const identity = new BrowserIdentityManager();
    identity.start(null);
    const anonymousId = identity.getDistinctId();

    expect(identity.identify('user-42')).toBe(anonymousId);
    expect(identity.getDistinctId()).toBe('user-42');
    expect(localStorage.getItem('__appss_distinct_id')).toBe('user-42');
  });

  it('stays silent when the ID it already uses is identified again', () => {
    const identity = new BrowserIdentityManager();
    identity.start(null);
    identity.identify('user-42');

    expect(identity.identify('user-42')).toBeNull();
  });

  it('reports the previous ID when switching between accounts', () => {
    const identity = new BrowserIdentityManager();
    identity.start(null);
    identity.identify('user-42');

    expect(identity.identify('user-7')).toBe('user-42');
    expect(identity.getDistinctId()).toBe('user-7');
  });

  it('restores the account across page loads, ahead of the platform ID', () => {
    const first = new BrowserIdentityManager();
    first.start('42');
    first.identify('user-42');

    const second = new BrowserIdentityManager();
    second.start('42');

    expect(second.getDistinctId()).toBe('user-42');
    expect(second.identify('user-42')).toBeNull();
  });

  it('issues a new anonymous ID on reset', () => {
    const identity = new BrowserIdentityManager();
    identity.start(null);
    const anonymousId = identity.getDistinctId();
    identity.identify('user-42');

    identity.reset(null);

    expect(identity.getDistinctId()).not.toBe(anonymousId);
    expect(identity.getDistinctId()).not.toBe('user-42');
    expect(localStorage.getItem('__appss_distinct_id')).toBeNull();
  });

  it('returns to the platform ID on reset', () => {
    const identity = new BrowserIdentityManager();
    identity.start('42');
    identity.identify('user-42');

    identity.reset('42');

    expect(identity.getDistinctId()).toBe('42');
  });

  it('links the new anonymous ID to the same account after reset', () => {
    const identity = new BrowserIdentityManager();
    identity.start(null);
    identity.identify('user-42');
    identity.reset(null);
    const anonymousId = identity.getDistinctId();

    expect(identity.identify('user-42')).toBe(anonymousId);
  });

  it('reports unavailable storage to the logger and keeps working', () => {
    const logger = testLogger();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage is full');
    });

    const identity = new BrowserIdentityManager();
    identity.start(null, logger);
    const anonymousId = identity.getDistinctId();

    expect(anonymousId).toBeTruthy();
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to persist the anonymous ID, falling back to a temporary one',
      expect.objectContaining({ error: expect.stringContaining('storage is full') as string }),
    );

    expect(identity.identify('user-42', logger)).toBe(anonymousId);
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to store the account ID',
      expect.objectContaining({ error: expect.stringContaining('storage is full') as string }),
    );

    setItem.mockRestore();
  });
});
