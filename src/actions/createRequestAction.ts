import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import cloneDeep = require('lodash/cloneDeep');

export class CreateRequestAction implements HttpRegionAction {
  id = ActionType.request;
  beforeAll = true;

  async process(context: ProcessorContext) : Promise<boolean> {
    if (context.httpRegion.request) {
      context.request = cloneDeep(context.httpRegion.request);
    }
    return true;
  }
}
