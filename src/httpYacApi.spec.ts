import { getVariables } from './httpYacApi';

import { initFileProvider, parseHttp } from './test/testUtils';

describe('httpYacApi', () => {
  describe('getVariables', () => {
    it('should return secret provided by environment', async () => {
      initFileProvider({
        '.env': 'secret=from .env',
      });
      const httpFile = await parseHttp(`
      # @name test
`);

      const variables = await getVariables({
        httpFile,
      });

      expect(variables).toEqual(
        expect.objectContaining({
          secret: 'from .env',
        })
      );
    });
    it('should return secret provided by context variables', async () => {
      initFileProvider({
        '.env': 'secret=from.env',
      });
      const httpFile = await parseHttp(`
      # @name test
`);

      const variables = await getVariables({
        httpFile,
        variables: {
          secret: 'cli args',
        },
      });

      expect(variables).toEqual(
        expect.objectContaining({
          secret: 'cli args',
        })
      );
    });
    it('should return secret provided by intellij', async () => {
      initFileProvider({
        '.env': 'secret=from.env',
        'http-client.env.json': JSON.stringify({
          dev: {
            secret: 'intellij variable',
          },
        }),
      });
      const httpFile = await parseHttp(`
      # @name test
`);

      const variables = await getVariables({
        httpFile,
        activeEnvironment: ['dev'],
      });

      expect(variables).toEqual(
        expect.objectContaining({
          secret: 'intellij variable',
        })
      );
    });
  });
});
