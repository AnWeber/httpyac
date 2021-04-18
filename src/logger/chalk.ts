import { environmentStore } from '../environments';
import { Chalk, Instance } from 'chalk';

export function chalkInstance() : Chalk {
  return new Instance(environmentStore.environmentConfig?.log?.supportAnsiColors === false ? { level: 0 } : undefined);
}
