import { httpClientProvider } from '../../io/httpClientProvider';
import * as models from '../../models';
import { userSessionStore } from '../../store';
import * as utils from '../../utils';
import { oauth2VariableReplacer } from './oauth2VariableReplacer';

const JWTToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

describe('oauth2VariableReplacer', () => {
  describe('oauth2VariableReplacer', () => {
    it('use client credentials flow', async () => {
      httpClientProvider.exchange = request => {
        expect(request.url).toBe('http://localhost:3000/token');
        expect(request.headers?.authorization).toBe('Basic cG9zdG1hbjpwb3N0bWFu');
        expect(request.headers?.['content-type']).toBe('application/x-www-form-urlencoded');
        expect(request.body).toBe('grant_type=client_credentials');
        return Promise.resolve({
          statusCode: 200,
          protocol: 'https',
          body: utils.stringifySafe({
            expires_in: 1000,
            access_token: JWTToken,
          }),
        });
      };

      const result = await oauth2VariableReplacer('oauth2', 'Authorization', {
        variables: {
          oauth2_tokenEndpoint: 'http://localhost:3000/token',
          oauth2_clientId: 'postman',
          oauth2_clientSecret: 'postman',
        },
      } as unknown as models.ProcessorContext);
      expect(result).toBe(`Bearer ${JWTToken}`);
      const openIdInformation: (models.UserSession & { accessToken?: string }) | undefined =
        userSessionStore.getUserSession(`client_credentials_oauth2_postman_http://localhost:3000/token`);
      expect(openIdInformation?.accessToken).toBe(JWTToken);
    });
    it('use client credentials flow with prefix', async () => {
      httpClientProvider.exchange = request => {
        expect(request.url).toBe('http://localhost:3000/token');
        expect(request.headers?.authorization).toBe('Basic cG9zdG1hbjpwb3N0bWFu');
        expect(request.headers?.['content-type']).toBe('application/x-www-form-urlencoded');
        expect(request.body).toBe('grant_type=client_credentials');
        return Promise.resolve({
          statusCode: 200,
          protocol: 'https',
          body: JSON.stringify({
            expires_in: 1000,
            access_token: JWTToken,
          }),
        });
      };

      const result = await oauth2VariableReplacer('oauth2 prefix', 'Authorization', {
        variables: {
          oauth2_tokenEndpoint: 'http://localhost:3000/token',
          prefix_clientId: 'postman',
          prefix_clientSecret: 'postman',
        },
      } as unknown as models.ProcessorContext);
      expect(result).toBe(`Bearer ${JWTToken}`);
      const openIdInformation: (models.UserSession & { accessToken?: string }) | undefined =
        userSessionStore.getUserSession(`client_credentials_oauth2_postman_http://localhost:3000/token`);
      expect(openIdInformation?.accessToken).toBe(JWTToken);
    });
    it('use password flow with prefix', async () => {
      httpClientProvider.exchange = request => {
        expect(request.url).toBe('http://localhost:3000/token');
        expect(request.headers?.authorization).toBe('Basic cG9zdG1hbjpwb3N0bWFu');
        expect(request.headers?.['content-type']).toBe('application/x-www-form-urlencoded');
        expect(request.body).toBe('grant_type=password&username=john&password=doe');
        return Promise.resolve({
          statusCode: 200,
          protocol: 'https',
          body: JSON.stringify({
            expires_in: 1000,
            access_token: JWTToken,
          }),
        });
      };

      const result = await oauth2VariableReplacer('oauth2 password prefix', 'Authorization', {
        variables: {
          oauth2_tokenEndpoint: 'http://localhost:3000/token',
          prefix_clientId: 'postman',
          prefix_clientSecret: 'postman',
          prefix_username: 'john',
          prefix_password: 'doe',
        },
      } as unknown as models.ProcessorContext);
      expect(result).toBe(`Bearer ${JWTToken}`);
      const openIdInformation: (models.UserSession & { accessToken?: string }) | undefined =
        userSessionStore.getUserSession(`password_prefix_postman_john_http://localhost:3000/token`);
      expect(openIdInformation?.accessToken).toBe(JWTToken);
    });
    it('should ignore non header Authorization', async () => {
      const result = await oauth2VariableReplacer('oauth2', 'url', {} as unknown as models.ProcessorContext);
      expect(result).toBe('oauth2');
    });
  });
});
