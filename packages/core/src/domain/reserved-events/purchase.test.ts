import { describe, it, expect } from 'vitest';
import { validatePurchaseProperties } from './purchase.js';
import { PURCHASE_EVENT } from '../../shared/constants.js';

describe('PURCHASE_EVENT', () => {
  it('is $purchase', () => {
    expect(PURCHASE_EVENT).toBe('$purchase');
  });
});

describe('validatePurchaseProperties', () => {
  it('passes with valid required properties', () => {
    expect(() => validatePurchaseProperties({ currency: 'USD', amount: 9.99 })).not.toThrow();
  });

  it('passes with all properties', () => {
    expect(() => validatePurchaseProperties({
      currency: 'EUR',
      amount: 100,
      transaction_status: 'completed',
      transaction_id: 'tx-123',
      product: 'Premium Plan',
      custom_field: 'value',
    })).not.toThrow();
  });

  it('allows zero amount', () => {
    expect(() => validatePurchaseProperties({ currency: 'USD', amount: 0 })).not.toThrow();
  });

  it('allows negative amount (refunds)', () => {
    expect(() => validatePurchaseProperties({ currency: 'USD', amount: -9.99 })).not.toThrow();
  });

  it('throws when currency is empty', () => {
    expect(() => validatePurchaseProperties({ currency: '', amount: 10 })).toThrow(TypeError);
  });

  it('throws when currency is not a string', () => {
    expect(() => validatePurchaseProperties({ currency: 123, amount: 10 })).toThrow(TypeError);
  });

  it('throws when amount is not a number', () => {
    expect(() => validatePurchaseProperties({ currency: 'USD', amount: '9.99' })).toThrow(TypeError);
  });

  it('throws when amount is NaN', () => {
    expect(() => validatePurchaseProperties({ currency: 'USD', amount: NaN })).toThrow(TypeError);
  });

  it('throws when amount is Infinity', () => {
    expect(() => validatePurchaseProperties({ currency: 'USD', amount: Infinity })).toThrow(TypeError);
  });
});
