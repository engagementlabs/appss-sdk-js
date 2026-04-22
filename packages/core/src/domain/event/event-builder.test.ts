import { describe, it, expect } from 'vitest';
import { buildEvent, eventToPayload } from './event-builder.js';

describe('buildEvent', () => {
  it('creates event with required fields', () => {
    const e = buildEvent({ event: 'purchase', distinctId: '42' });
    expect(e.event).toBe('purchase');
    expect(e.distinctId).toBe('42');
    expect(e.insertId).toBeTruthy();
    expect(e.timestamp).toBeInstanceOf(Date);
  });
  it('unique insertId per call', () => {
    const a = buildEvent({ event: 'a', distinctId: '1' });
    const b = buildEvent({ event: 'a', distinctId: '1' });
    expect(a.insertId).not.toBe(b.insertId);
  });
  it('passes properties', () => {
    const e = buildEvent({ event: 'a', distinctId: '1', properties: { x: 1 } });
    expect(e.properties).toEqual({ x: 1 });
  });
  it('throws on empty event name', () => {
    expect(() => buildEvent({ event: '', distinctId: '1' })).toThrow();
  });
});

describe('eventToPayload', () => {
  it('converts to wire format', () => {
    const e = buildEvent({ event: 'test', distinctId: '42', properties: { x: 1 } });
    const p = eventToPayload(e);
    expect(p.event).toBe('test');
    expect(p.distinct_id).toBe('42');
    expect(p.$insert_id).toBe(e.insertId);
    expect(typeof p.timestamp).toBe('string');
    expect(p.properties).toEqual({ x: 1 });
  });
  it('omits empty properties', () => {
    const p = eventToPayload(buildEvent({ event: 'a', distinctId: '1', properties: {} }));
    expect(p.properties).toBeUndefined();
  });
});
