export interface AppssEvent {
  event: string;
  distinctId: string;
  insertId: string;
  timestamp: Date;
  properties?: Record<string, unknown>;
}
