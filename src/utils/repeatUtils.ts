import * as models from '../models';
import { cloneResponse } from './requestUtils';
import { stringifySafe } from './stringUtils';

export async function repeat(
  load: () => Promise<models.HttpResponse | undefined>,
  context: { repeat?: models.RepeatOptions }
) {
  const loader: Array<() => Promise<models.HttpResponse | undefined>> = [];
  for (let index = 0; index < (context.repeat?.count || 1); index++) {
    loader.push(load);
  }
  const responses = [];
  if (context.repeat?.type === models.RepeatOrder.parallel) {
    const results = await Promise.all(loader.map(obj => obj()));
    for (const result of results) {
      if (result) {
        responses.push(result);
      }
    }
  } else {
    for (const load of loader) {
      const response = await load();
      if (response) {
        responses.push(response);
      }
    }
  }
  return mergeRepeatResponse(responses);
}

function mergeRepeatResponse(responses: Array<models.HttpResponse>): models.HttpResponse | undefined {
  if (responses.length > 1) {
    const result: models.HttpResponse = cloneResponse(responses[0]);

    delete result.prettyPrintBody;
    delete result.rawBody;
    const parsedBody: {
      responses: Array<models.HttpResponse>;
      statusCount: Record<string, number>;
      count: number;
    } = {
      responses: [],
      statusCount: {},
      count: responses.length,
    };
    for (const response of responses) {
      if (response.statusCode > result.statusCode) {
        result.statusCode = response.statusCode;
        result.statusMessage = response.statusMessage;
      }
      const statusString = `${response.statusCode}`;
      if (parsedBody.statusCount[statusString]) {
        parsedBody.statusCount[statusString] += 1;
      } else {
        parsedBody.statusCount[statusString] = 1;
      }
      delete response.prettyPrintBody;
      delete response.parsedBody;
      delete response.rawBody;
      parsedBody.responses.push(cloneResponse(response));
    }
    result.parsedBody = parsedBody;
    result.body = stringifySafe(parsedBody, 2);

    return result;
  }
  return responses.pop();
}
