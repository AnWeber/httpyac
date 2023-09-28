import * as models from '../../models';
import * as utils from '../../utils';

export class HttpyacJsApi {
  constructor(
    private readonly context: models.ProcessorContext,
    private readonly httpFileStore: models.HttpFileStore
  ) {}

  findHttpRegionInContext(name: string) {
    return utils.findHttpRegionInContext(name, this.context);
  }

  async import(fileName: string) {
    return await utils.importHttpFileInContext(fileName, this.httpFileStore, this.context);
  }

  setVariables(vars: models.Variables) {
    utils.setVariableInContext(vars, this.context);
  }

  async execute(httpRegion: models.HttpRegion | string, vars?: models.Variables): Promise<models.Variables> {
    if (vars) {
      utils.setVariableInContext(vars, this.context);
    }
    let obj: models.HttpRegion | undefined;
    if (utils.isString(httpRegion)) {
      obj = utils.findHttpRegionInContext(httpRegion, this.context);
    } else {
      obj = httpRegion;
    }
    if (obj) {
      const result = await obj?.execute(this.context);
      if (result) {
        const envKey = utils.toEnvironmentKey(this.context.activeEnvironment);
        utils.setVariableInContext(obj.variablesPerEnv[envKey], this.context);
      }
    }
    return this.context.variables;
  }
}
