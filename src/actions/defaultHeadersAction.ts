import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import * as utils from '../utils';

export class DefaultHeadersAction implements HttpRegionAction {
  id = ActionType.defaultHeaders;

  constructor(
    private readonly data: string,
    private readonly setHeaders: (headers: Record<string, unknown>, context: ProcessorContext) => void
  ) {}

  async process(context: ProcessorContext): Promise<boolean> {
    if (this.data && context.variables) {
      utils.report(context, 'set request headers');
      const headers = await utils.evalExpression(this.data, context);
      if (headers) {
        this.setHeaders(Object.assign({}, headers), context);
      }
    }
    return true;
  }
}
