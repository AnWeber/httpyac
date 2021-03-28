import { HttpRegionParser, ParserContext, HttpRegionParserResult, utils, ProcessorContext } from '..';



export class DefaultHeadersHttpRegionParser implements HttpRegionParser{

  constructor(private readonly getRequestDefaultHeaders: () => (Record<string, string> | undefined)){}


  async parse(lineReader: unknown, context: ParserContext): Promise<HttpRegionParserResult>{
    return false;
  }

  close({ httpRegion }: ParserContext): void {
    if (httpRegion.request) {
      httpRegion.actions.splice(utils.actionProcessorIndexAfterRequest(httpRegion), 0,
        {
          data: () => this.getRequestDefaultHeaders(),
          type: 'settings_default_headers',
          processor: defaultHeadersActionProcessor,
        });
    }
  }
}

async function defaultHeadersActionProcessor (data: () => (Record<string, string> | undefined), context: ProcessorContext) {
  const defaultHeaders = data();
  if (context.request && defaultHeaders) {
    for (const [key, value] of Object.entries(defaultHeaders)) {
      if (!context.request.headers[key]) {
        context.request.headers[key] = value;
      }
    }
  }
  return true;
}
