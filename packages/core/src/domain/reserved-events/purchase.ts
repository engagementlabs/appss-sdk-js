import { assertFiniteNumber, assertNonEmptyString } from '../../shared/utils/validation.js';

export interface PurchaseProperties {
  currency: string;
  amount: number;
  transaction_status?: string;
  transaction_id?: string;
  product?: string;
  [key: string]: unknown;
}

export function validatePurchaseProperties(properties: unknown): void {
  const props = properties as PurchaseProperties;
  assertNonEmptyString(props?.currency, 'currency');
  assertFiniteNumber(props?.amount, 'amount');
}
