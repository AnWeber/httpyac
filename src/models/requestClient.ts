import { HttpResponse, StreamResponse } from './httpResponse';

export type RequestClientResponse = undefined | void | HttpResponse;

export interface RequestClient<T = unknown> {
  readonly supportsStreaming: boolean;
  getSessionId?(): string;
  reportMessage: string;
  nativeClient: T;
  connect(obj: T | undefined): Promise<T>;
  send(body?: unknown): Promise<void>;
  /**
   * called after onStreaming finished using this client
   */
  streamEnded?(): void;
  disconnect(err?: Error): void;
  addEventListener<K extends keyof RequestClientEventMap>(
    type: K,
    listener: (ev: RequestClientEvent<RequestClientEventMap[K]>) => void
  ): void;
  removeEventListener<K extends keyof RequestClientEventMap>(
    type: K,
    listener: (ev: RequestClientEvent<RequestClientEventMap[K]>) => void
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

export class RequestClientEvent<T = undefined> extends Event {
  constructor(
    message: string,
    public readonly detail: T
  ) {
    super(message);
  }
}

export abstract class AbstractRequestClient<T> implements RequestClient<T> {
  abstract readonly supportsStreaming: boolean;
  abstract disconnect(err?: Error): void;
  abstract nativeClient: T;
  abstract reportMessage: string;
  abstract connect(obj: T | undefined): Promise<T>;
  abstract send(body?: unknown): Promise<void>;
  private eventEmitter = new EventTarget();

  addEventListener<K extends keyof RequestClientEventMap>(
    type: K,
    listener: (evt: RequestClientEvent<RequestClientEventMap[K]>) => void
  ): void {
    this.eventEmitter.addEventListener(type, evt =>
      this.isRequestClientEvent<RequestClientEventMap[K]>(evt) ? listener(evt) : undefined
    );
  }
  removeEventListener<K extends keyof RequestClientEventMap>(
    type: K,
    listener: (evt: RequestClientEvent<RequestClientEventMap[K]>) => void
  ) {
    this.eventEmitter.removeEventListener(type, evt =>
      this.isRequestClientEvent<RequestClientEventMap[K]>(evt) ? listener(evt) : undefined
    );
  }

  private isRequestClientEvent<T>(evt: Event): evt is RequestClientEvent<T> {
    return evt instanceof RequestClientEvent;
  }
  protected onMessage(type: string, response: HttpResponse & StreamResponse) {
    this.eventEmitter.dispatchEvent(new RequestClientEvent('message', [type, response]));
  }
  protected onProgress(percent: number) {
    this.eventEmitter.dispatchEvent(new RequestClientEvent('progress', percent));
  }
  protected onMetaData(type: string, response: HttpResponse & StreamResponse) {
    this.eventEmitter.dispatchEvent(new RequestClientEvent('metaData', [type, response]));
  }
  protected onDisconnect() {
    this.eventEmitter.dispatchEvent(new RequestClientEvent('disconnect', undefined));
  }
  public triggerEnd() {
    this.eventEmitter.dispatchEvent(new RequestClientEvent('end', undefined));
  }
}
