import { ActionType, HttpRegionAction, ProcessorContext} from '../models';
import cloneDeep = require('lodash/cloneDeep');

export class CreateRequestAction implements HttpRegionAction{
  type = ActionType.request;

  async process(context: ProcessorContext) : Promise<boolean> {
    if (context.httpRegion.request) {
      context.request = cloneDeep(context.httpRegion.request);
    }
    return true;
  }
}