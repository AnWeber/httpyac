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
    listener: (ev: CustomEvent<RequestClientEventMap[K]>) => void
  ): void;
  removeEventListener<K extends keyof RequestClientEventMap>(
    type: K,
    listener: (ev: CustomEvent<RequestClientEventMap[K]>) => void
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

if (!global.CustomEvent) {
  class CustomEvent<T = unknown> extends Event {
    #detail?: T;
    // eslint-disable-next-line no-undef
    constructor(message: string, options?: CustomEventInit<T>) {
      super(message, options);
      this.#detail = options?.detail;
    }

    public get detail(): T | undefined {
      return this.#detail;
    }

    public initCustomEvent(): void {
      throw new Error('not implemented');
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.CustomEvent = CustomEvent;
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
    listener: (evt: CustomEvent<RequestClientEventMap[K]>) => void
  ): void {
    this.eventEmitter.addEventListener(type, evt =>
      this.isCustomEvent<RequestClientEventMap[K]>(evt) ? listener(evt) : undefined
    );
  }
  removeEventListener<K extends keyof RequestClientEventMap>(
    type: K,
    listener: (evt: CustomEvent<RequestClientEventMap[K]>) => void
  ) {
    this.eventEmitter.removeEventListener(type, evt =>
      this.isCustomEvent<RequestClientEventMap[K]>(evt) ? listener(evt) : undefined
    );
  }

  private isCustomEvent<T>(evt: Event): evt is CustomEvent<T> {
    return evt instanceof CustomEvent;
  }
  protected onMessage(type: string, response: HttpResponse & StreamResponse) {
    this.eventEmitter.dispatchEvent(
      new CustomEvent('message', {
        detail: [type, response],
      })
    );
  }
  protected onProgress(percent: number) {
    this.eventEmitter.dispatchEvent(
      new CustomEvent('progress', {
        detail: percent,
      })
    );
  }
  protected onMetaData(type: string, response: HttpResponse & StreamResponse) {
    this.eventEmitter.dispatchEvent(
      new CustomEvent('metaData', {
        detail: [type, response],
      })
    );
  }
  protected onDisconnect() {
    this.eventEmitter.dispatchEvent(new CustomEvent('disconnect'));
  }
  public triggerEnd() {
    this.eventEmitter.dispatchEvent(new CustomEvent('end'));
  }
}
