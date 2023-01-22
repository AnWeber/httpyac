import { HttpResponse, StreamResponse } from './httpResponse';
import { EventEmitter } from 'events';

export interface RequestClient<T = unknown> {
  reportMessage: string;
  nativeClient: T;
  connect(): Promise<undefined | HttpResponse>;
  send(body: Buffer | string): Promise<undefined | HttpResponse>;
  close(): void;
  on<K extends keyof RequestClientEventMap>(
    type: K,
    listener: (this: RequestClient<T>, ev: RequestClientEventMap[K]) => void
  ): void;
  off<K extends keyof RequestClientEventMap>(
    type: K,
    listener: (this: RequestClient<T>, ev: RequestClientEventMap[K]) => void
  ): void;
}

interface RequestClientEventMap {
  progress: number;
  message: [string, HttpResponse & StreamResponse];
  metaData: [string, HttpResponse & StreamResponse];
}

export abstract class AbstractRequestClient<T> implements RequestClient<T> {
  abstract reportMessage: string;
  abstract connect(): Promise<undefined | HttpResponse>;
  abstract send(body?: string | Buffer): Promise<HttpResponse | undefined>;
  private eventEmitter = new EventEmitter();
  abstract close(): void;

  on<K extends keyof RequestClientEventMap>(
    type: K,
    listener: (this: RequestClient, ev: RequestClientEventMap[K]) => void
  ): void {
    this.eventEmitter.on(type, listener);
  }
  off<K extends keyof RequestClientEventMap>(
    type: K,
    listener: (this: RequestClient, ev: RequestClientEventMap[K]) => void
  ) {
    this.eventEmitter.off(type, listener);
  }
  protected onMessage(type: string, response: HttpResponse & StreamResponse) {
    this.eventEmitter.emit('message', [type, response]);
  }
  protected onProgress(percent: number) {
    this.eventEmitter.emit('progress', percent);
  }
  protected onMetaData(type: string, response: HttpResponse & StreamResponse) {
    this.eventEmitter.emit('metaData', [type, response]);
  }
}
