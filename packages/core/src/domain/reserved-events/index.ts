import { EventValidatorRegistry } from './registry.js';
import { validatePurchaseProperties } from './purchase.js';
import { PURCHASE_EVENT } from '../../shared/constants.js';

export { EventValidatorRegistry } from './registry.js';
export { validatePurchaseProperties } from './purchase.js';
export type { PurchaseProperties } from './purchase.js';
export type { ReservedEventMap, EventName, TrackArgs } from './event-map.js';

export function createValidatorRegistry(): EventValidatorRegistry {
  const registry = new EventValidatorRegistry();
  registry.register(PURCHASE_EVENT, validatePurchaseProperties);
  return registry;
}
