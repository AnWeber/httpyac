import { HttpResponse, StreamResponse } from './httpResponse';
import { EventEmitter } from 'events';

export interface RequestClient {
  send(body?: Buffer | string): Promise<undefined | HttpResponse>;
  close(): void;
  on<K extends keyof RequestClientEventMap>(
    type: K,
    listener: (this: RequestClient, ev: RequestClientEventMap[K]) => void
  ): void;
}

interface RequestClientEventMap {
  progress: number;
  message: HttpResponse & StreamResponse;
  metaData: HttpResponse & StreamResponse;
}

export class AbstractRequestClient extends EventEmitter {
  public onMessage(message: string | undefined, rawMessage: unknown) {
    this.emit('message', message, rawMessage);
  }
}
