import { HttpRegion, HttpFile } from './httpRegion';
import * as parser from './parser';
import { HttpOutputProcessor } from './output/httpOutputProcessor';
import { VariableProvider, httpFileVariableProvider, httpFileImportsVariableProvider } from './variables';
import { dotenvVariableProviderFactory } from './environments';
import { HttpClient, gotHttpClientFactory } from './httpClient';
import { environmentStore } from './environments/environmentStore';
import { trace, sendHttpFile, sendHttpRegion } from './utils';
import { log } from './logger';
import { httpFileStore } from './httpFileStore';

class HttpYacApi {
  readonly httpRegionParsers: Array<parser.HttpRegionParser>;
  readonly httpOutputProcessors: Array<HttpOutputProcessor>;
  readonly variableProviders: Array<VariableProvider>;

  httpClient: HttpClient = gotHttpClientFactory();
  constructor() {
    this.httpRegionParsers = [
      new parser.MetaHttpRegionParser(),
      new parser.JsHttpRegionParser(),
      new parser.RequestHttpRegionParser(),
      new parser.RequestBodyHttpRegionParser(),
    ];

    this.httpOutputProcessors = [];
    this.variableProviders = [
      dotenvVariableProviderFactory(),
      httpFileImportsVariableProvider,
      httpFileVariableProvider,
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
    const environement = await environmentStore.getVariables(httpFile.env);
    return Object.assign({},
      {
        httpYacApi,
        httpFile,
        environmentStore,
        httpFileStore,
        log,
        environement,
      },
      ...environement,
      ...(await Promise.all(
          httpYacApi.variableProviders
            .map(variableProvider => variableProvider(httpFile)
            )
      ))
    );
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