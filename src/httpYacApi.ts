import * as models from './models';
import * as parser from './parser';
import { provider, replacer } from './variables';
import * as utils from './utils';

export class HttpYacApi {
  readonly httpRegionParsers: Array<models.HttpRegionParser>;
  readonly variableProviders: Array<models.VariableProvider>;
  readonly variableReplacers: Array<models.VariableReplacer>;

  readonly additionalRequire: Record<string, unknown> = {};

  constructor() {
    this.httpRegionParsers = [
      new parser.MetaHttpRegionParser(),
      new parser.CommentHttpRegionParser(),
      new parser.VariableHttpRegionParser(),
      new parser.JsHttpRegionParser(),
      new parser.IntellijHttpRegionParser(),
      new parser.GqlHttpRegionParser(),
      new parser.RequestHttpRegionParser(),
      new parser.ResponseRefHttpRegionParser(),
      new parser.ResponseHttpRegionParser(),
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
      new replacer.EscapeVariableReplacer(),
    ];
  }


  /**
   * process one httpRegion of HttpFile
   * @param httpFile httpFile
   */
  async send(context: models.HttpFileSendContext | models.HttpRegionSendContext | models.HttpRegionsSendContext): Promise<boolean> {
    if (!context.processedHttpRegions) {
      context.processedHttpRegions = [];
    }
    let result = false;
    if (utils.isHttpRegionSendContext(context)) {
      result = await utils.sendHttpRegion(context);
    } else if (utils.isHttpRegionsSendContext(context)) {
      result = await utils.sendHttpRegions(context);
    } else {
      result = await utils.sendHttpFile(context);
    }
    if (context.scriptConsole
      && !!context.processedHttpRegions
      && context.processedHttpRegions.filter(obj => obj.testResults).length > 0) {
      const chalk = utils.chalkInstance();
      context.scriptConsole.info();
      const succededRequests = context.processedHttpRegions.filter(obj => !obj.testResults || obj.testResults.every(test => test.result)).length;
      const failedRequests = context.processedHttpRegions.filter(obj => !!obj.testResults && obj.testResults.some(test => !test.result)).length;
      context.scriptConsole.info(chalk`{bold ${context.processedHttpRegions.length}} requests with tested ({green ${succededRequests} succeeded}, {red ${failedRequests} failed})`);
    }
    return result;
  }
}

export const httpYacApi = new HttpYacApi();
