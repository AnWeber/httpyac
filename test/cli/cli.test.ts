import { convertCliOptionsToContext } from '../../src/cli/cli';

describe('cli', () => {
  describe('convertCliOptionsToContext', () => {
    it('should parse variables', () => {
      const result = convertCliOptionsToContext({ variables: ['name=value'] });
      expect(result.variables.name).toBe('value');
    });
    it('should support = character in variable value', () => {
      const result = convertCliOptionsToContext({
        variables: [
          'oauth2_authenticationEndpoint=https://login.microsoftonline.com/tenantId/oauth2/authorize?resource=resourceId',
        ],
      });
      expect(result.variables.oauth2_authenticationEndpoint).toBe(
        'https://login.microsoftonline.com/tenantId/oauth2/authorize?resource=resourceId'
      );
    });
  });
});
