import { describe, it, expect } from 'vitest';
import { Readiness, ReadinessGuard } from './readiness-guard.js';

describe('ReadinessGuard', () => {
  it('starts NotReady', () => {
    expect(new ReadinessGuard().getState()).toBe(Readiness.NotReady);
  });
  it('NotReady → Configured → Ready', () => {
    const g = new ReadinessGuard();
    g.transition(Readiness.Configured);
    g.transition(Readiness.Ready);
    expect(g.canTrack()).toBe(true);
  });
  it('Ready → Ready (re-identify)', () => {
    const g = new ReadinessGuard();
    g.transition(Readiness.Configured);
    g.transition(Readiness.Ready);
    g.transition(Readiness.Ready);
    expect(g.getState()).toBe(Readiness.Ready);
  });
  it('rejects NotReady → Ready', () => {
    expect(() => new ReadinessGuard().transition(Readiness.Ready)).toThrow();
  });
  it('canIdentify from Configured and Ready', () => {
    const g = new ReadinessGuard();
    expect(g.canIdentify()).toBe(false);
    g.transition(Readiness.Configured);
    expect(g.canIdentify()).toBe(true);
  });
  it('canTrack only from Ready', () => {
    const g = new ReadinessGuard();
    g.transition(Readiness.Configured);
    expect(g.canTrack()).toBe(false);
  });
  it('reset', () => {
    const g = new ReadinessGuard();
    g.transition(Readiness.Configured);
    g.reset();
    expect(g.canInit()).toBe(true);
  });
});
