import * as models from '../models';

export class TestRequestClient extends models.AbstractRequestClient<undefined> {
  public constructor(
    private readonly request: models.Request,
    private readonly action?: (request: models.Request) => Promise<Partial<models.HttpResponse>>
  ) {
    super();
  }
  supportsStreaming: boolean = false;
  disconnect(err?: Error | undefined): void {
    if (err) {
      console.info(err);
    }
  }
  nativeClient: undefined;
  reportMessage: string = 'test client';
  async connect(): Promise<undefined> {}
  async send(): Promise<void> {
    const response = Object.assign(
      {
        protocol: 'test',
        statusCode: 200,
      },
      await this.action?.(this.request)
    );

    if (!response.body && response.parsedBody) {
      response.body = JSON.stringify(response.parsedBody);
    }

    if (typeof response.body === 'string' && !response.rawBody) {
      response.rawBody = Buffer.from(response.body);
    }

    this.onMessage('message', response);
  }
}
