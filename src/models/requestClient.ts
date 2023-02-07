import { HttpResponse, StreamResponse } from './httpResponse';
import { EventEmitter } from 'events';

export type RequestClientResponse = undefined | void | HttpResponse;

export interface RequestClient<T = unknown> {
  readonly supportsStreaming: boolean;
  reportMessage: string;
  nativeClient: T;
  connect(): Promise<void>;
  send(body?: unknown): Promise<void>;
  disconnect(err?: Error): void;
  on<K extends keyof RequestClientEventMap>(
    type: K,
    listener: (this: RequestClient<T>, ev: RequestClientEventMap[K]) => void
  ): void;
  off<K extends keyof RequestClientEventMap>(
    type: K,
    listener: (this: RequestClient<T>, ev: RequestClientEventMap[K]) => void
  ): void;
  triggerEnd(): void;
}

interface RequestClientEventMap {
  progress: number;
  message: [string, HttpResponse & StreamResponse];
  metaData: [string, HttpResponse & StreamResponse];
  disconnect: void;
  end: void;
}

export abstract class AbstractRequestClient<T> implements RequestClient<T> {
  abstract readonly supportsStreaming: boolean;
  abstract disconnect(err?: Error): void;
  abstract nativeClient: T;
  abstract reportMessage: string;
  abstract connect(): Promise<void>;
  abstract send(body?: unknown): Promise<void>;
  private eventEmitter = new EventEmitter();

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
  protected onDisconnect() {
    this.eventEmitter.emit('disconnect');
  }
  public triggerEnd() {
    this.eventEmitter.emit('end');
  }
}
