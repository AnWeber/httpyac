import * as models from '../../models';
import * as utils from '../../utils';

export async function replaceIntellijProjectContext(
  text: unknown,
  _type: string,
  context: models.ProcessorContext
): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => {
    if (variable.trim() === '$projectRoot') {
      return context.httpFile.rootDir;
    }
    return undefined;
  });
}
