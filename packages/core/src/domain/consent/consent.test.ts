import { describe, it, expect } from 'vitest';
import { ConsentManager } from './consent-manager.js';

describe('ConsentManager', () => {
  it('starts opted in', () => { expect(new ConsentManager().isOptedOut()).toBe(false); });
  it('optOut', () => { const c = new ConsentManager(); c.optOut(); expect(c.isOptedOut()).toBe(true); });
  it('optIn restores', () => { const c = new ConsentManager(); c.optOut(); c.optIn(); expect(c.isOptedOut()).toBe(false); });
});
