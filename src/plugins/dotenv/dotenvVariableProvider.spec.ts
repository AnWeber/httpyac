import { VariableProviderContext } from '../../models';
import { initNestedFileProvider, parseHttp } from '../../test/testUtils';
import { provideDotenvEnvironments, provideDotenvVariables } from './dotenvVariableProvider';

describe('dotenvVariableProvider', () => {
  const httpContent = `
  GET  /json
  foo: {{foo}}
      `;
  describe('provideDotenvEnvironments', () => {
    const envContent = '';
    it('should provide environments', async () => {
      initNestedFileProvider({
        childs: {
          '.env': envContent,
          'dev.env': envContent,
          'prod.env': envContent,
          '.env.local': envContent,
        },
      });
      const httpFile = await parseHttp(httpContent, '/src/test.http');
      const envs = await provideDotenvEnvironments({
        httpFile,
      } as VariableProviderContext);
      expect(envs).toEqual(['dev', 'prod', 'local']);
    });

    it('should ignore invalid environments', async () => {
      initNestedFileProvider({
        childs: {
          '.env': envContent,
          '.envrc': envContent,
        },
      });
      const httpFile = await parseHttp(httpContent, '/src/test.http');
      const envs = await provideDotenvEnvironments({
        httpFile,
      } as VariableProviderContext);
      expect(envs).toEqual([]);
    });
    it('should provide environment in envdir', async () => {
      initNestedFileProvider({
        childs: {
          foo: {
            childs: {
              'foo.env': envContent,
            },
          },
        },
      });
      const httpFile = await parseHttp(httpContent, '/src/test.http');
      const envs = await provideDotenvEnvironments({
        httpFile,
        config: {
          envDirName: 'foo',
        },
      } as VariableProviderContext);
      expect(envs).toEqual(['foo']);
    });
    it('should provide environment in HTTPYAC_ENV', async () => {
      initNestedFileProvider({
        childs: {
          foo: {
            childs: {
              'foo.env': envContent,
            },
          },
        },
      });
      process.env.HTTPYAC_ENV = '/foo';
      const httpFile = await parseHttp(httpContent, '/src/test.http');
      const envs = await provideDotenvEnvironments({
        httpFile,
      } as VariableProviderContext);
      expect(envs).toEqual(['foo']);
    });
  });
  describe('provideDotenvVariables', () => {
    it('should provide variables', async () => {
      initNestedFileProvider({
        childs: {
          '.env': `default=1`,
          'dev.env': `dev=1`,
          'prod.env': `prod=1`,
        },
      });
      const httpFile = await parseHttp(httpContent, '/src/test.http');
      const variables = await provideDotenvVariables(['dev'], {
        httpFile,
      } as VariableProviderContext);
      expect(variables).toEqual({
        default: '1',
        dev: '1',
      });
    });
    it('should provide variables from multiple envs', async () => {
      initNestedFileProvider({
        childs: {
          '.env': `default=1`,
          'dev.env': `dev=1`,
          'prod.env': `prod=1`,
        },
      });
      const httpFile = await parseHttp(httpContent, '/src/test.http');
      const variables = await provideDotenvVariables(['dev', 'prod'], {
        httpFile,
      } as VariableProviderContext);
      expect(variables).toEqual({
        default: '1',
        dev: '1',
        prod: '1',
      });
    });
    it('should provide variables from config', async () => {
      initNestedFileProvider({
        childs: {
          foo: {
            childs: {
              '.env': `default=1`,
            },
          },
        },
      });
      process.env.HTTPYAC_ENV = '/foo';
      const httpFile = await parseHttp(httpContent, '/src/test.http');
      const variables = await provideDotenvVariables([], {
        httpFile,
        config: {
          envDirName: 'foo',
        },
      } as VariableProviderContext);
      expect(variables).toEqual({
        default: '1',
      });
    });
    it('should provide variables from HTTPYAC_ENV', async () => {
      initNestedFileProvider({
        childs: {
          foo: {
            childs: {
              '.env': `default=1`,
            },
          },
        },
      });
      process.env.HTTPYAC_ENV = '/foo';
      const httpFile = await parseHttp(httpContent, '/src/test.http');
      const variables = await provideDotenvVariables([], {
        httpFile,
      } as VariableProviderContext);
      expect(variables).toEqual({
        default: '1',
      });
    });
  });
});
