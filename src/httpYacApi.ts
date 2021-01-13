import { HttpRegion, HttpFile } from './httpRegion';
import * as parser from './parser';
import { HttpOutputProcessor } from './output/httpOutputProcessor';
import { provider, replacer } from './variables';
import { dotenvVariableProviderFactory } from './environments';
import { HttpClient, gotHttpClientFactory } from './httpClient';
import { environmentStore } from './environments/environmentStore';
import { trace, sendHttpFile, sendHttpRegion } from './utils';
import { log } from './logger';

class HttpYacApi {
  readonly httpRegionParsers: Array<parser.HttpRegionParser>;
  readonly httpOutputProcessors: Array<HttpOutputProcessor>;
  readonly variableProviders: Array<provider.VariableProvider>;
  readonly variableReplacers: Array<replacer.VariableReplacer>;

  readonly additionalRequire: Record<string, any> = {};

  httpClient: HttpClient = gotHttpClientFactory();
  constructor() {
    this.httpRegionParsers = [
      new parser.MetaHttpRegionParser(),
      new parser.JsHttpRegionParser(),
      new parser.IntellijHttpRegionParser(),
      new parser.RequestHttpRegionParser(),
      new parser.RequestBodyHttpRegionParser(),
    ];

    this.httpOutputProcessors = [];
    this.variableProviders = [
      dotenvVariableProviderFactory(),
      provider.httpFileImportsVariableProvider,
      provider.httpFileVariableProvider,
    ];

    this.variableReplacers = [
      replacer.intellijVariableReplacer,
      replacer.jsVariableReplacer,
    ];
  }


  /**
   * process one httpRegion of HttpFile
   * @param httpFile httpFile
   */
  @trace()
  async send(httpRegion: HttpRegion, httpFile: HttpFile) {
    const variables = await this.getVariables(httpFile);
    await sendHttpRegion(httpRegion, httpFile, variables);
  }
  /**
   * process all httpRegion of HttpFile
   * @param httpFile httpFile
   */
  @trace()
  async sendAll(httpFile: HttpFile) {
    const variables = await this.getVariables(httpFile);
    await sendHttpFile(httpFile, variables);
  }
  @trace()
  private async getVariables(httpFile: HttpFile): Promise<Record<string, any>> {
    let environment: Record<string, Record<string, any>> = {};
    if (httpFile.env) {
      for (const env of httpFile.env) {
        environment[env] = await environmentStore.getVariables(env);
      }
    }
    const variables = Object.assign({
      log,
      environment,
    },
      ...Object.entries(environment).map(([key, value]) => value),
      ...(await Promise.all(
          httpYacApi.variableProviders
            .map(variableProvider => variableProvider(httpFile)
            )
      ))
    );
    log.trace(variables);
    return variables;
  }

  /**
   * ececute httpOutputProcessor
   * @param httpRegion httpRegion
   * @param httpFile httpFile
   */
  @trace()
  public async show(httpRegion: HttpRegion<unknown>, httpFile: HttpFile) {
    await Promise.all(this.httpOutputProcessors.map(outputProcessor => outputProcessor(httpRegion, httpFile)));
  }

  toString() {
    return 'httpYacApi';
  }
}

export const httpYacApi = new HttpYacApi();