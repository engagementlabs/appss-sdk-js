import type { EventProperties } from '../../shared/types/wire-protocol.js';
import type { PurchaseProperties } from './purchase.js';

export interface ReservedEventMap {
  '$purchase': PurchaseProperties;
}

export type EventName = keyof ReservedEventMap | (string & {});

export type TrackArgs<E extends string> = E extends keyof ReservedEventMap
  ? [properties: ReservedEventMap[E]]
  : [properties?: EventProperties];
