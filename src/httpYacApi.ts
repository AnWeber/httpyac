import { HttpFileSendContext, HttpRegionSendContext, HttpRegionParser, VariableReplacer, VariableProvider} from './models';
import * as parser from './parser';
import { provider, replacer } from './variables';
import { sendHttpFile, sendHttpRegion, isHttpRegionSendContext } from './utils';

class HttpYacApi {
  readonly httpRegionParsers: Array<HttpRegionParser>;
  readonly variableProviders: Array<VariableProvider>;
  readonly variableReplacers: Array<VariableReplacer>;

  readonly additionalRequire: Record<string, any> = {};

  constructor() {
    this.httpRegionParsers = [
      new parser.MetaHttpRegionParser(),
      new parser.CommentHttpRegionParser(),
      new parser.VariableHttpRegionParser(),
      new parser.JsHttpRegionParser(),
      new parser.IntellijHttpRegionParser(),
      new parser.GqlHttpRegionParser(),
      new parser.RequestHttpRegionParser(),
      new parser.ResponseHttpRegionParser(),
      new parser.RequestBodyHttpRegionParser(),
    ];

    this.variableProviders = [
      new provider.HttpFileImportsVariableProvider(),
      new provider.HttpFileVariableProvider(),
    ];

    this.variableReplacers = [
      replacer.intellijVariableReplacer,
      replacer.jsVariableReplacer,
      replacer.hostVariableReplacer,
      replacer.openIdVariableReplacer,
      replacer.awsAuthVariableReplacer,
      replacer.clientCertVariableReplacer,
      replacer.basicAuthVariableReplacer,
      replacer.digestAuthVariableReplacer,
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
}

export const httpYacApi = new HttpYacApi();