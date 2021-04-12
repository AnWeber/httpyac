import { environmentStore } from '../environments';
import { Instance } from 'chalk';

export function chalkInstance() {
  return new Instance(environmentStore.environmentConfig?.log?.supportAnsiColors === false ? { level: 0 } : undefined);
}
