import { userInteractionProvider } from '../../../io';
import * as models from '../../../models';
import { getDisplayName } from '../../../utils';

export function noteMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext) {
  if (type === 'note') {
    const note = value || `Are you sure you want to send the request ${getDisplayName(context.httpRegion)}?`;

    context.httpRegion.hooks.execute.addInterceptor({
      id: 'note',
      beforeLoop: () => userInteractionProvider.showNote(note),
    });
    return true;
  }
  return false;
}
