import type { TransportResponse } from '../shared/types/wire-protocol.js';

export interface ITransport {
  send(path: string, body: unknown, headers: Record<string, string>): Promise<TransportResponse>;
}
