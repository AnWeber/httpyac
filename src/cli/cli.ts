import * as utils from '../utils';
import { initIOProvider } from './initCliProvider';
import { sendCommand } from './send';
import { SendOptions } from './send/options';
import { Command } from 'commander';
import { join } from 'path';

export async function execute(rawArgs: string[]): Promise<SendOptions | undefined> {
  try {
    initIOProvider();
    const program = new Command();
    const packageJson = await utils.parseJson<Record<string, string>>(join(__dirname, '../package.json'));
    program
      .version(packageJson?.version || '0.0.1')
      .description('httpYac - Quickly and easily send REST, SOAP, GraphQL and gRPC requests')
      .addCommand(sendCommand(), { isDefault: true });
    await program.parseAsync(rawArgs);

    return program.opts<SendOptions>();
  } catch (error) {
    console.error(error);
  }
  return undefined;
}
