import * as models from '../../../models';
import * as utils from '../../../utils';

export async function transfromMultilineFormUrlEncoded(request: models.Request): Promise<void> {
  if (request.body && utils.isString(request.body) && utils.isMimeTypeFormUrlEncoded(request.contentType)) {
    const lines = utils.toMultiLineArray(request.body);
    if (lines.length > 0) {
      const result = [];

      for (const line of lines) {
        result.push(
          line
            .split('=')
            .map(t => t.trim())
            .join('=')
        );
      }
      request.body = result.join('');
    }
  }
}
