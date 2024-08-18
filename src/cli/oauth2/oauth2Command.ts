import { Command } from 'commander';

import { createEmptyProcessorContext } from '../../httpYacApi';
import { getOAuth2Response } from '../../plugins/oauth2/oauth2VariableReplacer';
import { HttpFileStore } from '../../store';

export function oauth2Command() {
  const program = new Command('oauth2')
    .description('generate oauth2 token')
    .option('-f, --flow <flow>', 'flow used for oauth2 token generation', 'client_credentials')
    .option('--prefix <prefix>', 'variable prefix used for variables')
    .option('-e, --env  <env...>', 'list of environments')
    .option(
      '-o, --output <output>',
      'output format of response (access_token, refresh_token, response)',
      'access_token'
    )
    .option('--var  <variables...>', 'list of variables (e.g foo="bar")')
    .action(execute);
  return program;
}

export interface OAuth2Options {
  env?: Array<string>;
  flow: string;
  output?: 'access_token' | 'refresh_token' | 'response';
  var?: Array<string>;
  verbose?: boolean;
  prefix?: string;
}

async function execute(options: OAuth2Options): Promise<void> {
  const httpFileStore = new HttpFileStore();

  const context = await createEmptyProcessorContext({
    activeEnvironment: options.env,
    httpFile: await httpFileStore.initHttpFile('oauth2.http', {
      workingDir: process.cwd(),
    }),
    variables: options.var
      ? Object.fromEntries(
          options.var.map(obj => {
            const split = obj.split('=');
            return [split[0], split.slice(1).join('=')];
          })
        )
      : undefined,
  });
  const result = await getOAuth2Response(options.flow, options.prefix, context);
  if (result) {
    switch (options.output) {
      case 'response':
        console.info(
          JSON.stringify(
            {
              access_token: result.accessToken,
              expires_in: result.expiresIn,
              refresh_token: result.refreshToken,
              refresh_expires_in: result.refreshExpiresIn,
            },
            null,
            2
          )
        );
        break;
      case 'refresh_token':
        console.info(result.refreshToken);
        break;
      default:
        console.info(result.accessToken);
        break;
    }
  } else {
    process.exitCode = 1;
    console.info('no valid auth response');
  }
}
