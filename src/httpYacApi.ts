import { HttpFileSendContext, HttpRegionSendContext, HttpRegionParser, VariableReplacer, VariableProvider } from './models';
import * as parser from './parser';
import { provider, replacer } from './variables';
import { sendHttpFile, sendHttpRegion, isHttpRegionSendContext } from './utils';

class HttpYacApi {
  readonly httpRegionParsers: Array<HttpRegionParser>;
  readonly variableProviders: Array<VariableProvider>;
  readonly variableReplacers: Array<VariableReplacer>;

  readonly additionalRequire: Record<string, unknown> = {};

  constructor() {
    this.httpRegionParsers = [
      new parser.MetaHttpRegionParser(),
      new parser.CommentHttpRegionParser(),
      new parser.VariableHttpRegionParser(),
      new parser.JsHttpRegionParser(),
      new parser.IntellijHttpRegionParser(),
      new parser.GqlHttpRegionParser(),
      new parser.ResponseHttpRegionParser(),
      new parser.RequestHttpRegionParser(),
      new parser.RequestBodyHttpRegionParser(),
    ];

    this.variableProviders = [
      new provider.HttpFileImportsVariableProvider(),
      new provider.HttpFileVariableProvider(),
      new provider.IntellijVariableProvider(),
    ];

    this.variableReplacers = [
      new replacer.IntellijVariableReplacer(),
      new replacer.JavascriptVariableReplacer(),
      new replacer.HostVariableReplacer(),
      new replacer.OpenIdVariableReplacer(),
      new replacer.AwsAuthVariableReplacer(),
      new replacer.ClientCertVariableReplacer(),
      new replacer.BasicAuthVariableReplacer(),
      new replacer.DigestAuthVariableReplacer(),
    ];
  }


  /**
   * process one httpRegion of HttpFile
   * @param httpFile httpFile
   */
  async send(context: HttpFileSendContext | HttpRegionSendContext) {
    if (isHttpRegionSendContext(context)) {
      return await sendHttpRegion(context);
    }
    return await sendHttpFile(context);

  }
}

export const httpYacApi = new HttpYacApi();
