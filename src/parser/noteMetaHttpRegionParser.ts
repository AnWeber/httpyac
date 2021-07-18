import { HttpRegionParserResult, HttpRegionParser, ParserContext } from '../models';
import { getDisplayName } from '../utils';
import { GenericAction } from '../actions';
import { userInteractionProvider } from '../io';

export class NoteMetaHttpRegionParser implements HttpRegionParser {

  async parse(): Promise<HttpRegionParserResult> {
    return false;
  }

  close({ httpRegion }: ParserContext): void {
    if (httpRegion.metaData.note) {
      const note = httpRegion.metaData.note || `Are you sure you want to send the request ${getDisplayName(httpRegion)}?`;
      httpRegion.actions.splice(0, 0, new GenericAction('note', () => userInteractionProvider.showNote(note)));
    }
  }
}
