import { getEnvironments, send } from '../../../httpYacApi';
import { VariableProviderContext } from '../../../models';
import { initHttpClientProvider, initNestedFileProvider, parseHttp, sendHttpFile } from '../../../test/testUtils';

describe('environment.dotenv', () => {
  let envContent = '';
  const httpContent = `
GET  /json
foo: {{foo}}
    `;
  beforeAll(async () => {
    envContent = `
host=http://localhost
foo=bar`;
  });

  describe('provideEnvironments', () => {
    it('parse .env in root dir', async () => {
      initNestedFileProvider({
        childs: {
          '.env': envContent,
          'dev.env': envContent,
          'prod.env': envContent,
          '.env.local': envContent,
        },
      });
      const httpFile = await parseHttp(httpContent, '/src/test.http');
      const envs = await getEnvironments({
        httpFile,
      } as VariableProviderContext);

      expect(envs).toEqual(['dev', 'local', 'prod']);
    });

    it('parse .env in env dir', async () => {
      initNestedFileProvider({
        childs: {
          env: {
            childs: {
              '.env': envContent,
              'dev.env': envContent,
              'prod.env': envContent,
              '.env.local': envContent,
            },
          },
        },
      });
      const httpFile = await parseHttp(httpContent, '/src/test.http');
      const envs = await getEnvironments({
        httpFile,
      } as VariableProviderContext);

      expect(envs).toEqual(['dev', 'local', 'prod']);
    });
    it('parse .env in config env dir', async () => {
      initNestedFileProvider({
        childs: {
          env: {
            childs: {
              '.env': envContent,
              'not.env': envContent,
            },
          },
          foo: {
            childs: {
              '.env': envContent,
              'dev.env': envContent,
              'prod.env': envContent,
              '.env.local': envContent,
            },
          },
        },
      });
      const httpFile = await parseHttp(httpContent, '/src/test.http');
      const envs = await getEnvironments({
        httpFile,
        config: {
          envDirName: 'foo',
        },
      } as VariableProviderContext);

      expect(envs).toEqual(['dev', 'local', 'prod']);
    });
    it('parse .env in httpyenv dir', async () => {
      initNestedFileProvider({
        childs: {
          foo: {
            childs: {
              '.env': envContent,
              'dev.env': envContent,
              'prod.env': envContent,
              '.env.local': envContent,
            },
          },
        },
      });
      const httpFile = await parseHttp(httpContent, '/src/test.http');
      try {
        process.env.HTTPYAC_ENV = '/foo';
        const envs = await getEnvironments({
          httpFile,
        } as VariableProviderContext);

        expect(envs).toEqual(['dev', 'local', 'prod']);
      } finally {
        delete process.env.HTTPYAC_ENV;
      }
    });
  });

  describe('provideVariables', () => {
    it('parse .env in root dir', async () => {
      initNestedFileProvider({
        childs: {
          '.env': envContent,
          src: {
            childs: {
              'test.http': httpContent,
            },
          },
        },
      });
      const requests = initHttpClientProvider();

      const httpFile = await parseHttp(httpContent, '/src/test.http');
      await sendHttpFile({ httpFile });

      expect(requests[0].headers?.foo).toBe('bar');
    });
    it('parse .env in env folder', async () => {
      initNestedFileProvider({
        childs: {
          env: {
            childs: {
              '.env': envContent,
            },
          },
          src: {
            childs: {
              'test.http': httpContent,
            },
          },
        },
      });
      const requests = initHttpClientProvider();

      const httpFile = await parseHttp(httpContent, '/src/test.http');
      await sendHttpFile({ httpFile });

      expect(requests[0].headers?.foo).toBe('bar');
    });
    it('parse .env in config env dir', async () => {
      initNestedFileProvider({
        childs: {
          foo: {
            childs: {
              '.env': envContent,
            },
          },
          src: {
            childs: {
              'test.http': httpContent,
            },
          },
        },
      });
      const requests = initHttpClientProvider();

      const httpFile = await parseHttp(httpContent, '/src/test.http');
      await send({
        httpFile,
        config: {
          envDirName: '/foo',
        },
      });

      expect(requests[0].headers?.foo).toBe('bar');
    });
    it('use activeenvironemt', async () => {
      initNestedFileProvider({
        childs: {
          foo: {
            childs: {
              '.env': envContent,
            },
          },
          src: {
            childs: {
              'test.http': httpContent,
            },
          },
        },
      });
      const requests = initHttpClientProvider();

      try {
        process.env.HTTPYAC_ENV = '/foo';
        const httpFile = await parseHttp(httpContent, '/src/test.http');
        await send({
          httpFile,
        });

        expect(requests[0].headers?.foo).toBe('bar');
      } finally {
        delete process.env.HTTPYAC_ENV;
      }
    });
    it('parse .env in HTTPYAC_ENV', async () => {
      initNestedFileProvider({
        childs: {
          env: {
            childs: {
              'dev.env': envContent,
            },
          },
          src: {
            childs: {
              'test.http': httpContent,
            },
          },
        },
      });
      const requests = initHttpClientProvider();
      const httpFile = await parseHttp(httpContent, '/src/test.http');
      await send({
        activeEnvironment: ['dev'],
        httpFile,
      });
      expect(requests[0].headers?.foo).toBe('bar');
    });
  });
});
