export interface AppssEvent {
  event: string;
  distinctId: string;
  insertId: string;
  timestamp: Date;
  properties?: Record<string, unknown>;
}

export type EventProperties = Record<string, unknown>;
export type UserProperties = Record<string, unknown>;

export interface EventPayload {
  event: string;
  distinct_id: string;
  $insert_id: string;
  timestamp: string;
  properties?: Record<string, unknown>;
}

export interface BatchRequest {
  batch: EventPayload[];
}

export interface UserPropertiesRequest {
  distinct_id: string;
  properties: Record<string, unknown>;
}

export interface BatchResponse {
  accepted: number;
}

export interface TransportResponse {
  statusCode: number;
  headers: Record<string, string>;
  body?: unknown;
}
