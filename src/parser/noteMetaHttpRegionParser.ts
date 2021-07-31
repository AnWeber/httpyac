import { ParserContext } from '../models';
import { getDisplayName } from '../utils';
import { userInteractionProvider } from '../io';
import { ParserId } from './initHooks';

export async function injectNote({ httpRegion }: ParserContext): Promise<void> {
  if (httpRegion.metaData.note) {
    const note = httpRegion.metaData.note || `Are you sure you want to send the request ${getDisplayName(httpRegion)}?`;

    httpRegion.hooks.execute.addHook(ParserId.note, () => userInteractionProvider.showNote(note), {
      before: Object.keys(ParserId),
    });
  }
}
