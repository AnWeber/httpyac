import { OpenIdConfiguration } from '../../models';
import { DEFAULT_CALLBACK_URI, getOpenIdConfiguration } from './openIdConfiguration';

describe('getOpenIdConfiguration', () => {
  describe('tokenEndpoint', () => {
    it('should be empty when nothing passed', () => {
      const result = getOpenIdConfiguration('prefix', {}) as OpenIdConfiguration;
      expect(result.tokenEndpoint).toBeUndefined();
    });
    it('should use value if passed', () => {
      const result = getOpenIdConfiguration('prefix', {
        prefix_tokenEndpoint: 'https://httpyac.github.io',
      }) as OpenIdConfiguration;
      expect(result.tokenEndpoint).toEqual('https://httpyac.github.io');
    });
    it('should use fallback to oauth2 value', () => {
      const result = getOpenIdConfiguration('prefix', {
        oauth2_tokenEndpoint: 'https://httpyac.github.io',
      }) as OpenIdConfiguration;
      expect(result.tokenEndpoint).toEqual('https://httpyac.github.io');
    });
  });
  describe('useAuthorizationHeader', () => {
    it('should use default when nothing passed', () => {
      const result = getOpenIdConfiguration('prefix', {}) as OpenIdConfiguration;
      expect(result.useAuthorizationHeader).toEqual(true);
    });
    it('should use value if passed as boolean', () => {
      const result = getOpenIdConfiguration('prefix', { prefix_useAuthorizationHeader: false }) as OpenIdConfiguration;
      expect(result.useAuthorizationHeader).toEqual(false);
    });
    it('should use check false if passed as string', () => {
      const result = getOpenIdConfiguration('prefix', {
        prefix_useAuthorizationHeader: 'false',
      }) as OpenIdConfiguration;
      expect(result.useAuthorizationHeader).toEqual(false);
    });
    it('should use check true if passed as string', () => {
      const result = getOpenIdConfiguration('prefix', {
        prefix_useAuthorizationHeader: 'True',
      }) as OpenIdConfiguration;
      expect(result.useAuthorizationHeader).toEqual(true);
    });
    it('should use false if passed as number', () => {
      const result = getOpenIdConfiguration('prefix', {
        prefix_useAuthorizationHeader: '0',
      }) as OpenIdConfiguration;
      expect(result.useAuthorizationHeader).toEqual(false);
    });
    it('should use default on unknown value', () => {
      const result = getOpenIdConfiguration('prefix', {
        prefix_useAuthorizationHeader: new Date(),
      }) as OpenIdConfiguration;
      expect(result.useAuthorizationHeader).toEqual(true);
    });
    it('should use fallback to oauth2 value', () => {
      const result = getOpenIdConfiguration('prefix', {
        oauth2_useAuthorizationHeader: false,
      }) as OpenIdConfiguration;
      expect(result.useAuthorizationHeader).toEqual(false);
    });
  });
  describe('redirectUri', () => {
    it('should default when nothing passed', () => {
      const result = getOpenIdConfiguration('prefix', {}) as OpenIdConfiguration;
      expect(result.redirectUri.toString()).toEqual(DEFAULT_CALLBACK_URI);
    });

    it('should throw on bad url', () => {
      expect(() => getOpenIdConfiguration('prefix', { prefix_redirectUri: 'not-a-url' })).toThrow(
        'Expected a valid URL, but received not-a-url'
      );
    });

    it('should use valid url when passed', () => {
      const result = getOpenIdConfiguration('prefix', {
        prefix_redirectUri: 'http://my-url.com:1234',
      }) as OpenIdConfiguration;
      expect(result.redirectUri.toString()).toEqual('http://my-url.com:1234/');
    });

    it('should expand token_endpoint', () => {
      const result = getOpenIdConfiguration('prefix', {
        prefix_tokenEndpoint: '{{host}}/api/token',
        host: 'http://127.0.0.1',
      }) as OpenIdConfiguration;
      expect(result.tokenEndpoint).toEqual('http://127.0.0.1/api/token');
    });
    it('should fallback to oauth2 prefix', () => {
      const result = getOpenIdConfiguration('prefix', {
        oauth2_tokenEndpoint: '{{host}}/api/token',
        host: 'http://127.0.0.1',
      }) as OpenIdConfiguration;
      expect(result.tokenEndpoint).toEqual('http://127.0.0.1/api/token');
    });
  });
});
