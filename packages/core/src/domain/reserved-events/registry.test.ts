import { describe, it, expect } from 'vitest';
import { createValidatorRegistry } from './index.js';
import { PURCHASE_EVENT } from '../../shared/constants.js';

describe('EventValidatorRegistry', () => {
  it('validates $purchase with missing currency', () => {
    const registry = createValidatorRegistry();
    expect(() => registry.validate(PURCHASE_EVENT, { amount: 10 })).toThrow(TypeError);
  });

  it('validates $purchase with invalid amount', () => {
    const registry = createValidatorRegistry();
    expect(() => registry.validate(PURCHASE_EVENT, { currency: 'USD', amount: NaN })).toThrow(TypeError);
  });

  it('passes $purchase with valid properties', () => {
    const registry = createValidatorRegistry();
    expect(() => registry.validate(PURCHASE_EVENT, { currency: 'USD', amount: 9.99 })).not.toThrow();
  });

  it('skips validation for unregistered events', () => {
    const registry = createValidatorRegistry();
    expect(() => registry.validate('custom_event', {})).not.toThrow();
    expect(() => registry.validate('custom_event', undefined)).not.toThrow();
  });
});
