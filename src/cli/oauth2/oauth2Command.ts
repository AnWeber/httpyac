import { createEmptyProcessorContext } from '../../httpYacApi';
import { HttpFileStore } from '../../store';
import { getOAuth2Response } from '../../variables/replacer';
import { Command } from 'commander';

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
    .option('--var  <variables...>', 'list of variables')
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
    httpFile: await httpFileStore.initHttpFile('oauth2.http', {
      activeEnvironment: options.env,
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
