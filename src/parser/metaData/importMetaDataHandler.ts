import { ImportMetaAction } from '../../actions';
import * as models from '../../models';

export function importMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext) {
  if (type === 'import' && value) {
    context.httpRegion.hooks.execute.addObjHook(obj => obj.process, new ImportMetaAction(value, context.httpFileStore));
    return true;
  }
  return false;
}
