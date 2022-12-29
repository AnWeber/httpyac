import * as models from '../../../models';
import * as utils from '../../../utils';

export function handleNameMetaData(response: models.HttpResponse, context: models.ProcessorContext) {
  const { httpRegion } = context;
  if (utils.isString(httpRegion.metaData.name)) {
    const name = httpRegion.metaData.name
      .trim()
      .replace(/\s/gu, '-')
      .replace(/-./gu, value => value[1].toUpperCase());
    utils.setVariableInContext(
      { [name]: response.parsedBody || response.body, [`${name}Response`]: response },
      context
    );
  }
}
