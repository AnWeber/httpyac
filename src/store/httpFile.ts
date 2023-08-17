import * as models from '../models';

export class HttpFile implements models.HttpFile {
  constructor(
    public fileName: models.PathLike,
    public readonly rootDir?: models.PathLike
  ) {}
  readonly hooks = {
    parse: new models.ParseHook(),
    parseMetaData: new models.ParseMetaDataHook(),
    parseEndRegion: new models.ParseEndRegionHook(),
    provideAssertValue: new models.ProvideAssertValue(),
    replaceVariable: new models.ReplaceVariableHook(),
    provideEnvironments: new models.ProvideEnvironmentsHook(),
    provideVariables: new models.ProvideVariablesHook(),
    execute: new models.ExecuteHook(),
    onStreaming: new models.OnStreaming(),
    onRequest: new models.OnRequestHook(),
    onResponse: new models.OnResponseHook(),
    responseLogging: new models.ResponseLoggingHook(),
  };
  readonly httpRegions: Array<models.HttpRegion> = [];
  activeEnvironment?: string[];

  public findHttpRegion(name: string): models.HttpRegion | undefined {
    return this.httpRegions.find(obj => obj.metaData?.name === name && !obj.metaData.disabled);
  }

  public get globalHttpRegions() {
    return this.httpRegions.filter(obj => obj.isGlobal() && !obj.metaData.disabled);
  }
}
