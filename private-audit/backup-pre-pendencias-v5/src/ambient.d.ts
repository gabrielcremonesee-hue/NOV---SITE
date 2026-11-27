declare module 'ws' {
  import type { EventEmitter } from 'events';
  import type { IncomingMessage } from 'http';
  import type { Duplex } from 'stream';

  export interface WsClient extends EventEmitter {
    readonly OPEN: number;
    readonly readyState: number;
    send(data: string | Buffer): void;
    close(code?: number, data?: string): void;
  }

  export class WebSocketServer extends EventEmitter {
    constructor(options?: { noServer?: boolean; server?: unknown; path?: string });
    handleUpgrade(
      request: IncomingMessage,
      socket: Duplex,
      head: Buffer,
      callback: (client: WsClient, request: IncomingMessage) => void
    ): void;
    on(
      event: 'connection',
      listener: (socket: WsClient, request: IncomingMessage, ...args: any[]) => void
    ): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }
}

declare module '/app.js' {
  const mod: Record<string, unknown>;
  export default mod;
}
