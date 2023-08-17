import * as models from '../../../models';
import * as utils from '../../../utils';

export function importMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext) {
  if (type === 'import' && value) {
    context.httpRegion.hooks.execute.addObjHook(obj => obj.process, new ImportMetaAction(value, context.httpFileStore));
    return true;
  }
  return false;
}

class ImportMetaAction {
  id = 'import';

  constructor(
    private readonly fileName: string,
    private readonly httpFileStore: models.HttpFileStore
  ) {}

  async process(context: models.ProcessorContext): Promise<boolean> {
    return utils.importHttpFileInContext(this.fileName, this.httpFileStore, context);
  }
}
