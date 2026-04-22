import { describe, it, expect } from 'vitest';
import { IdentityManager } from './identity-manager.js';

describe('IdentityManager', () => {
  it('starts unidentified', () => {
    const im = new IdentityManager();
    expect(im.isIdentified()).toBe(false);
    expect(im.getDistinctId()).toBeNull();
  });
  it('identify sets distinctId', () => {
    const im = new IdentityManager();
    im.identify('123');
    expect(im.isIdentified()).toBe(true);
    expect(im.getDistinctId()).toBe('123');
  });
  it('different id resets pending properties', () => {
    const im = new IdentityManager();
    im.identify('1');
    im.setUserProperty('a', 1);
    im.identify('2');
    expect(im.peekPendingProperties()).toBeUndefined();
  });
  it('setUserProperty accumulates', () => {
    const im = new IdentityManager();
    im.setUserProperty('a', 1);
    im.setUserProperty('b', 2);
    expect(im.peekPendingProperties()).toEqual({ a: 1, b: 2 });
  });
  it('peek does not clear buffer', () => {
    const im = new IdentityManager();
    im.setUserProperty('x', 'y');
    im.peekPendingProperties();
    expect(im.hasPendingProperties()).toBe(true);
  });
  it('clearPendingProperties clears buffer', () => {
    const im = new IdentityManager();
    im.setUserProperty('x', 'y');
    im.clearPendingProperties();
    expect(im.peekPendingProperties()).toBeUndefined();
    expect(im.hasPendingProperties()).toBe(false);
  });
  it('hasPendingProperties', () => {
    const im = new IdentityManager();
    expect(im.hasPendingProperties()).toBe(false);
    im.setUserProperty('k', 'v');
    expect(im.hasPendingProperties()).toBe(true);
  });
  it('throws on empty key', () => {
    const im = new IdentityManager();
    expect(() => im.setUserProperty('', 'v')).toThrow();
  });
  it('reset clears everything', () => {
    const im = new IdentityManager();
    im.identify('1');
    im.setUserProperty('k', 'v');
    im.reset();
    expect(im.isIdentified()).toBe(false);
    expect(im.peekPendingProperties()).toBeUndefined();
  });
});
