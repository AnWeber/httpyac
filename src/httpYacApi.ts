import { HttpFileSendContext, HttpRegionSendContext, HttpRegionParser, VariableReplacer, VariableProvider, HttpRegionsSendContext } from './models';
import * as parser from './parser';
import { provider, replacer } from './variables';
import * as utils from './utils';

export class HttpYacApi {
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
      new replacer.RestClientVariableReplacer(),
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
  async send(context: HttpFileSendContext | HttpRegionSendContext | HttpRegionsSendContext) : Promise<boolean> {
    if (utils.isHttpRegionSendContext(context)) {
      return await utils.sendHttpRegion(context);
    }
    if (utils.isHttpRegionsSendContext(context)) {
      return await utils.sendHttpRegions(context);
    }
    return await utils.sendHttpFile(context);
  }
}

export const httpYacApi = new HttpYacApi();
