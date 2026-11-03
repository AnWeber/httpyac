import { getLocal } from 'mockttp';

import { getClientOptions, gotHttpClient } from '../gotUtils';

describe('got HTTP client', () => {
  const server = getLocal();
  beforeAll(async () => await server.start());
  afterAll(async () => await server.stop());

  it('disables retries while keeping the response wrapper', () => {
    const options = getClientOptions({ url: 'http://localhost' }, {});
    expect(options.retry).toEqual({ limit: 0 });
    expect(options.resolveBodyOnly).toBe(false);
  });

  it.each([10000, 0])('converts a numeric request timeout of %i to a Got request timeout', timeout => {
    const options = getClientOptions({ url: 'http://localhost', timeout }, {});

    expect(options.timeout).toEqual({ request: timeout });
  });

  it('leaves the timeout unset when none is configured', () => {
    const options = getClientOptions({ url: 'http://localhost' }, {});

    expect(options.timeout).toBeUndefined();
  });

  it.each([5000, 0])('converts a numeric configured timeout of %i to a Got request timeout', timeout => {
    const config = { request: { timeout } };
    const options = getClientOptions({ url: 'http://localhost' }, { config });

    expect(options.timeout).toEqual({ request: timeout });
    expect(config.request.timeout).toBe(timeout);
  });

  it('lets a request timeout override the configured timeout', () => {
    const options = getClientOptions(
      { url: 'http://localhost', timeout: 10000 },
      { config: { request: { timeout: 5000 } } }
    );

    expect(options.timeout).toEqual({ request: 10000 });
  });

  it('preserves phase-specific configured timeouts when overriding the total timeout', () => {
    const timeout = { connect: 1000, request: 5000 };
    const options = getClientOptions({ url: 'http://localhost', timeout: 10000 }, { config: { request: { timeout } } });

    expect(options.timeout).toEqual({ connect: 1000, request: 10000 });
    expect(timeout).toEqual({ connect: 1000, request: 5000 });
  });

  it('lets native request options override the total timeout while retaining phase-specific limits', () => {
    const options = getClientOptions(
      {
        url: 'http://localhost',
        timeout: 10000,
        options: { timeout: { request: 2000, response: 500 } },
      },
      { config: { request: { timeout: { connect: 1000, request: 5000 } } } }
    );

    expect(options.timeout).toEqual({ connect: 1000, request: 2000, response: 500 });
  });

  it('enforces the numeric timeout on an unresponsive server', async () => {
    await server.forGet('/timeout').thenTimeout();

    await expect(
      gotHttpClient({ url: `http://localhost:${server.port}/timeout`, timeout: 50 }, {})
    ).rejects.toMatchObject({
      name: 'TimeoutError',
      code: 'ETIMEDOUT',
      event: 'request',
    });
  });

  it('returns a Buffer for the raw response body', async () => {
    await server.forGet('/body').thenReply(200, 'hello');

    const response = await gotHttpClient({ url: `http://localhost:${server.port}/body` }, {});

    expect(response).not.toBe(false);
    if (response) {
      expect(response.body).toBe('hello');
      expect(response.rawBody).toEqual(Buffer.from('hello'));
      expect(Buffer.isBuffer(response.rawBody)).toBe(true);
    }
  });
});
