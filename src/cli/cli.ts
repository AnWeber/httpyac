import { Command } from 'commander';
import { join } from 'path';

import * as utils from '../utils';
import { initIOProvider } from './initCliProvider';
import { oauth2Command } from './oauth2';
import { sendCommand } from './send';

export async function createProgram() {
  const program = new Command();
  const packageJson = await utils.parseJson<Record<string, string>>(join(__dirname, '../package.json'));
  program
    .version(packageJson?.version || '0.0.1')
    .description('httpYac - Quickly and easily send REST, SOAP, GraphQL and gRPC requests')
    .addCommand(oauth2Command())
    .addCommand(sendCommand(), { isDefault: true });
  return program;
}

export async function execute(rawArgs: string[]): Promise<void> {
  try {
    await initIOProvider();
    const program = await createProgram();
    await program.parseAsync(rawArgs);
  } catch (err) {
    console.error(err);
    if (!process.exitCode) {
      process.exitCode = 1;
    }
    throw err;
  } finally {
    // needed because of async
    // eslint-disable-next-line node/no-process-exit
    process.exit();
  }
}
