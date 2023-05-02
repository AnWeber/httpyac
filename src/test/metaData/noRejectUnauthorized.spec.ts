import { initFileProvider, sendHttp, parseHttp, sendHttpFile } from '../testUtils';
import { getLocal, generateCACertificate } from 'mockttp';

describe('metadata.noRejectUnauthorized', () => {
  it('should throw self signed certificate error', async () => {
    const localServer = getLocal({
      https: await generateCACertificate({
        commonName: 'badssl',
      }),
    });
    try {
      await localServer.start();
      initFileProvider();
      await localServer.forGet('/json').thenReply(200);

      await sendHttp(
        `
GET /json
    `,
        {
          host: `https://localhost:${localServer.port}`,
        }
      );

      throw new Error('no error while sendhttp');
    } catch (err) {
      expect(err instanceof Error && err.name).toBe('RequestError');
      expect(err.toString()).toContain('signed certificate in certificate chain');
    } finally {
      localServer.stop();
    }
  });
  it('should use metadata tag', async () => {
    const localServer = getLocal({
      https: await generateCACertificate({
        commonName: 'badssl',
      }),
    });
    try {
      await localServer.start();
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/json').thenReply(200);

      const respones = await sendHttp(
        `
# @no-reject-unauthorized
GET /json
    `,
        {
          host: `http://localhost:${localServer.port}`,
        }
      );

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].path).toBe('/json');
      expect(respones.length).toBe(1);
      expect(respones[0].statusCode).toBe(200);
    } finally {
      localServer.stop();
    }
  });
  it('should use intellij config', async () => {
    const localServer = getLocal({
      https: await generateCACertificate({
        commonName: 'badssl',
      }),
    });
    try {
      await localServer.start();
      initFileProvider({
        'http-client.env.json': JSON.stringify({
          Local: {
            request_rejectUnauthorized: false,
          },
        }),
      });
      const mockedEndpoints = await localServer.forGet('/json').thenReply(200);

      const httpFile = await parseHttp(
        `
GET /json
    `
      );
      httpFile.activeEnvironment = ['Local'];

      const respones = await sendHttpFile(httpFile, {
        host: `http://localhost:${localServer.port}`,
      });
      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].path).toBe('/json');
      expect(respones.length).toBe(1);
      expect(respones[0].statusCode).toBe(200);
    } finally {
      localServer.stop();
    }
  });
  it('should use .env', async () => {
    const localServer = getLocal({
      https: await generateCACertificate({
        commonName: 'badssl',
      }),
    });
    try {
      await localServer.start();
      initFileProvider({
        '.env': `request_rejectUnauthorized=false`,
      });
      const mockedEndpoints = await localServer.forGet('/json').thenReply(200);

      const respones = await sendHttp(
        `
GET /json
    `,
        {
          host: `http://localhost:${localServer.port}`,
        }
      );

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].path).toBe('/json');
      expect(respones.length).toBe(1);
      expect(respones[0].statusCode).toBe(200);
    } finally {
      localServer.stop();
    }
  });
});
