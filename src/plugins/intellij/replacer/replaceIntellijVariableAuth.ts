import { OpenIdConfiguration, ProcessorContext, Variables } from '../../../models';
import { getOAuth2Response } from '../../oauth2';
import { setVariableInContext } from '../../../utils';
import { log } from '../../../io';
export async function replaceIntellijVariableAuth(
  variable: string,
  context: ProcessorContext
): Promise<string | undefined> {
  const trimmedVariable = variable.trim();
  if (trimmedVariable.startsWith('$auth.token') || trimmedVariable.startsWith('$auth.idToken')) {
    const token = await getOAuthToken(trimmedVariable, context);
    if (token) {
      return `${token}`;
    }
  }
  return undefined;
}

async function getOAuthToken(variable: string, context: ProcessorContext) {
  const match = /^\$auth.(?<type>token|idToken)\s*\(\s*"?(?<name>[^"]*)"?\s*\)$/u.exec(variable);
  if (match && match.groups?.type && match.groups?.name) {
    const authConfig = getOpenIdConfiguration(match.groups.name, context.variables);
    if (!authConfig?.flow) {
      return undefined;
    }
    setVariableInContext(
      {
        intellij_oauth2: authConfig.config,
      },
      context
    );

    const openIdInformation = await getOAuth2Response(authConfig.flow, 'intellij_oauth2', context);

    if (authConfig.useIdToken || match.groups.type === 'idToken') {
      return openIdInformation?.idToken;
    }
    return openIdInformation?.accessToken;
  }
  return undefined;
}

function getOpenIdConfiguration(name: string, variables: Variables) {
  if (!isIntellijAuth(variables.Security)) {
    log.warn('no intellij auth security found');
    return undefined;
  }
  const auth = variables.Security?.Auth?.[name];
  if (!auth) {
    log.warn(`no auth security found with name ${name}`);
    return undefined;
  }

  const config: OpenIdConfiguration = {
    variablePrefix: '__intellij_oauth2__',
    authorizationEndpoint: auth['Auth URL'],
    deviceCodeEndpoint: auth['Device Auth URL'],
    tokenEndpoint: auth['Token URL'],
    clientId: auth['Client ID'],
    clientSecret: auth['Client Secret'],
    resource: transformCustomRequestParamterToString(auth['Custom Request Parameters']?.resource),
    audience: transformCustomRequestParamterToString(auth['Custom Request Parameters']?.audience),
    scope: auth.Scope,
    username: auth.Username,
    password: auth.Password,
    useAuthorizationHeader: auth['Client Credentials'] === 'basic',
    usePkce: !!auth.PKCE,
  };

  return {
    flow: mapGrantType(auth['Grant Type']),
    useIdToken: auth['Use ID Token'],
    config,
  };
}

function transformCustomRequestParamterToString(
  val: undefined | string | Array<string> | CustomRequestParameter | Array<CustomRequestParameter>
): string | Array<string> | undefined {
  if (!val) {
    return val;
  }
  if (typeof val === 'string') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(v => (typeof v === 'string' ? v : v.Value));
  }
  return val.Value;
}

function mapGrantType(
  type: undefined | 'Authorization Code' | 'Implicit' | 'Password' | 'Client Credentials' | 'Device Authorization'
) {
  switch (type) {
    case 'Authorization Code':
      return 'authorization_code';
    case 'Client Credentials':
      return 'client_credentials';
    case 'Device Authorization':
      return 'device_code';
    case 'Implicit':
      return 'implicit';
    case 'Password':
      return 'password';
    default:
      return undefined;
  }
}

interface IntellijSecurity {
  Auth: Record<
    string,
    {
      Type: 'OAuth2' | 'Mock';
      'Grant Type'?: 'Authorization Code' | 'Implicit' | 'Password' | 'Client Credentials' | 'Device Authorization';
      'Auth URL'?: string;
      'Token URL'?: string;
      'Redirect URL'?: string;
      'Client ID'?: string;
      'Client Secret'?: string;
      'Client Credentials'?: boolean | 'basic' | 'in body' | 'none';
      Username?: string;
      Password?: string;
      'Acquire Automatically'?: boolean;
      Scope?: string;
      State?: string;
      PKCE?: boolean | { 'Code Challenge Method': 'SHA-256' | 'Plain'; 'Code Verifier': string };
      'Open Complete URI'?: boolean;
      'Device Auth URL'?: string;
      'Start Polling After Browser'?: boolean;
      'Use ID Token'?: boolean;
      'Custom Request Parameters': {
        resource: string | Array<string> | CustomRequestParameter | Array<CustomRequestParameter>;
        audience: string | Array<string>;
      };
      Token?: 'string';
      'ID Token'?: string;
    }
  >;
}
type CustomRequestParameter = {
  Value: string;
  Use: 'In Auth Request' | 'In Token Request' | 'Everywhere';
};

function isIntellijAuth(obj: unknown): obj is IntellijSecurity {
  const sec = obj as IntellijSecurity;
  return !!sec?.Auth;
}
