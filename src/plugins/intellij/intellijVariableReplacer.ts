import * as utils from '../../utils';
import { v4 } from 'uuid';

export async function replaceDynamicIntellijVariables(text: unknown): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => {
    switch (variable.trim()) {
      case '$uuid':
        return v4();
      case '$timestamp':
        return Date.now();
      case '$randomInt':
        return Math.floor(Math.random() * 1000);
      default:
        return undefined;
    }
  });
}
