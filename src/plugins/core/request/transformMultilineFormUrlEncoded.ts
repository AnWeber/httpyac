import * as models from '../../../models';
import * as utils from '../../../utils';

export async function transformMultilineFormUrlEncoded(request: models.Request): Promise<void> {
  if (request.body && utils.isString(request.body) && utils.isMimeTypeFormUrlEncoded(request.contentType)) {
    const lines = utils.toMultiLineArray(request.body);
    if (lines.length > 0) {
      const result = [];

      const splitCharts = ['=', '&'];

      for (const line of lines) {
        result.push(
          splitCharts.reduce(
            (p, c) =>
              p
                .split(c)
                .map(t => t.trim())
                .join(c),
            line
          )
        );
      }
      request.body = result.join('');
    }
  }
}
