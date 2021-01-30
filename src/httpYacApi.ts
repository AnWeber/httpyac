import { VariableReplacerType, HttpFileSendContext, HttpRegionSendContext, HttpRegionParser, HttpClient, VariableReplacer, HttpFile, HttpRegion, ProcessorContext} from './models';
import * as parser from './parser';
import { HttpOutputProcessor } from './output/httpOutputProcessor';
import { provider, replacer } from './variables';
import { dotenvVariableProviderFactory } from './environments';
import { gotHttpClientFactory } from './gotHttpClientFactory';
import { sendHttpFile, sendHttpRegion, isHttpRegionSendContext } from './utils';

class HttpYacApi {
  readonly httpRegionParsers: Array<HttpRegionParser>;
  readonly httpOutputProcessors: Array<HttpOutputProcessor>;
  readonly variableProviders: Array<provider.VariableProvider>;
  readonly variableReplacers: Array<VariableReplacer>;

  readonly additionalRequire: Record<string, any> = {};

  httpClient: HttpClient = gotHttpClientFactory();
  constructor() {
    this.httpRegionParsers = [
      new parser.MetaHttpRegionParser(),
      new parser.VariableHttpRegionParser(),
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
      replacer.basicAuthVariableReplacer,
      replacer.digestAuthVariableReplacer,
      replacer.hostVariableReplacer,
    ];
  }



  /**
   * process one httpRegion of HttpFile
   * @param httpFile httpFile
   */
  async send(context: HttpFileSendContext | HttpRegionSendContext) {
    if (isHttpRegionSendContext(context)) {
      return await sendHttpRegion(context);
    } else {
      return await sendHttpFile(context);
    }
  }


  async replaceVariables(text: string, type: VariableReplacerType | string, context: ProcessorContext): Promise<string | undefined> {
    let result: string | undefined = text;
    for (var replacer of this.variableReplacers) {
      if (result) {
        result = await replacer(result, type, context);
      }
    }
    return result;
  }

  /**
   * ececute httpOutputProcessor
   * @param httpRegion httpRegion
   * @param httpFile httpFile
   */
  public async show(httpRegion: HttpRegion<unknown>, httpFile: HttpFile) {
    await Promise.all(this.httpOutputProcessors.map(outputProcessor => outputProcessor(httpRegion, httpFile)));
  }

  toString() {
    return 'httpYacApi';
  }
}

export const httpYacApi = new HttpYacApi();