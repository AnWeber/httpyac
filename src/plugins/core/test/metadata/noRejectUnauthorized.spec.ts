import { generateCACertificate, getLocal, Mockttp } from 'mockttp';

import { initFileProvider, parseHttp, sendHttp, sendHttpFile } from '../../../../test/testUtils';
import { TestResultStatus } from '../../../../models';

describe('metadata.noRejectUnauthorized', () => {
  let localServer: Mockttp;
  beforeAll(async () => {
    localServer = getLocal({
      https: await generateCACertificate({
        commonName: 'badssl',
      }),
    });
    await localServer.start();
  });
  afterAll(async () => await localServer.stop());
  it('should throw self signed certificate error', async () => {
    initFileProvider();

    const httpFile = await parseHttp(`
GET /selfsignederror
    `);
    await localServer.forGet('/selfsignederror').thenReply(200);

    await sendHttpFile({
      httpFile,
      variables: {
        host: `https://localhost:${localServer.port}`,
      },
    });
    expect(httpFile.httpRegions[0].testResults?.some(t => t.status === TestResultStatus.ERROR)).toBeTruthy();
  });
  it('should use metadata tag', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forGet('/metadata').thenReply(200);

    const respones = await sendHttp(
      `
# @no-reject-unauthorized
GET /metadata
    `,
      {
        host: `https://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(1);
    expect(requests[0].path).toBe('/metadata');
    expect(respones.length).toBe(1);
    expect(respones[0].statusCode).toBe(200);
  });
  it('should use intellij config', async () => {
    initFileProvider({
      'http-client.env.json': JSON.stringify({
        Local: {
          request_rejectUnauthorized: false,
        },
      }),
    });
    const mockedEndpoints = await localServer.forGet('/intellijconfig').thenReply(200);

    const httpFile = await parseHttp(
      `
GET /intellijconfig
    `
    );

    const respones = await sendHttpFile({
      httpFile,
      activeEnvironment: ['Local'],
      variables: {
        host: `https://localhost:${localServer.port}`,
      },
    });
    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(1);
    expect(requests[0].path).toBe('/intellijconfig');
    expect(respones.length).toBe(1);
    expect(respones[0].statusCode).toBe(200);
  });
  it('should use .env', async () => {
    initFileProvider({
      '.env': `request_rejectUnauthorized=false`,
    });
    const mockedEndpoints = await localServer.forGet('/dotenv').thenReply(200);

    const respones = await sendHttp(
      `
GET /dotenv
    `,
      {
        host: `https://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests.length).toBe(1);
    expect(requests[0].path).toBe('/dotenv');
    expect(respones.length).toBe(1);
    expect(respones[0].statusCode).toBe(200);
  });
});
