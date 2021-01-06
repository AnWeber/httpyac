import { HttpRegion, HttpFile } from './httpRegion';
import * as parser from './parser';
import { HttpOutputProcessor } from './output/httpOutputProcessor';
import { VariableProvider, httpFileVariableProvider, httpFileImportsVariableProvider } from './variables';
import { dotenvVariableProviderFactory } from './environments';
import { HttpClient, gotHttpClientFactory } from './httpClient';
import { environmentStore } from './environments/environmentStore';
import { trace } from './utils';
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
    if (!httpRegion.disabled) {
      const variables = await this.getVariables(httpFile);
      for (const prevHttpRegion of httpFile.httpRegions) {
        if (prevHttpRegion === httpRegion) {
          break;
        }
        if (!prevHttpRegion.request && !prevHttpRegion.disabled) {
          await this.processHttpRegionActions(prevHttpRegion, httpFile, variables);
        }
      }
      await this.processHttpRegionActions(httpRegion, httpFile, variables);
    }
  }
  /**
   * process all httpRegion of HttpFile
   * @param httpFile httpFile
   */
  @trace()
  async sendAll(httpFile: HttpFile) {
    const variables = await this.getVariables(httpFile);
    for (const httpRegion of httpFile.httpRegions) {
      if (!httpRegion.disabled) {
        await this.processHttpRegionActions(httpRegion, httpFile, variables);
      }
    }
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

  private async processHttpRegionActions(httpRegion: HttpRegion<unknown>, httpFile: HttpFile, variables: Record<string, any>) {
    for (const action of httpRegion.actions) {
      if (!httpRegion.disabled) {
        await action.processor(action.data, httpRegion, httpFile, variables);
      }
    }
  }

  toString() {
    return 'httpYacApi';
  }
}

export const httpYacApi = new HttpYacApi();