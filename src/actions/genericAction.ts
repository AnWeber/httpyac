import { HttpRegionAction, ProcessorContext } from '../models';


export class GenericAction implements HttpRegionAction {

  constructor(readonly type: string, private readonly action: (context: ProcessorContext) => Promise<boolean>) {}

  async process(context: ProcessorContext) : Promise<boolean> {
    return await this.action(context);
  }
}
