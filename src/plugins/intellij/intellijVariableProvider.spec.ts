import { VariableProviderContext } from '../../models';
import { initFileProvider } from '../../test/testUtils';
import { provideIntellijVariables } from './intellijVariableProvider';

describe('intellijVariableProvider', () => {
  describe('provideIntellijVariables', () => {
    it('should retrieve empty variables', async () => {
      initFileProvider();
      const variables = await provideIntellijVariables(['test'], {
        httpFile: {
          fileName: 'test.http',
        },
        variables: {},
      } as VariableProviderContext);
      expect(variables).toEqual({});
    });
    it('should pick variables from http-client.env.json', async () => {
      initFileProvider({
        'http-client.env.json': JSON.stringify({
          test: {
            foo: 'bar',
          },
        }),
      });
      const variables = await provideIntellijVariables(['test'], {
        httpFile: {
          fileName: 'test.http',
        },
        variables: {},
      } as VariableProviderContext);
      expect(variables).toEqual({
        foo: 'bar',
      });
    });
    it('should pick variables from http-client.private.env.json', async () => {
      initFileProvider({
        'http-client.private.env.json': JSON.stringify({
          test: {
            foo: 'bar',
          },
        }),
      });
      const variables = await provideIntellijVariables(['test'], {
        httpFile: {
          fileName: 'test.http',
        },
        variables: {},
      } as VariableProviderContext);
      expect(variables).toEqual({
        foo: 'bar',
      });
    });
    it('should pick variables from http-client.private.env.json over http-client.env.json', async () => {
      initFileProvider({
        'http-client.private.env.json': JSON.stringify({
          test: {
            foo: 'bar',
          },
        }),
        'http-client.env.json': JSON.stringify({
          test: {
            foo: 'not bar',
          },
        }),
      });
      const variables = await provideIntellijVariables(['test'], {
        httpFile: {
          fileName: 'test.http',
        },
        variables: {},
      } as VariableProviderContext);
      expect(variables).toEqual({
        foo: 'bar',
      });
    });
  });
});
