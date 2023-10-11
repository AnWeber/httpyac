import * as models from '../models';
import { cloneResponse } from './requestUtils';
import { stringifySafe } from './stringUtils';

export async function repeat(
  load: () => Promise<models.HttpResponse | void | undefined>,
  context: { repeat?: models.RepeatOptions; isMainContext?: boolean }
) {
  const loader: Array<() => Promise<models.HttpResponse | void | undefined>> = [];
  let repeatCount = 1;
  if (context.repeat?.count && !!context.isMainContext) {
    repeatCount = context.repeat.count;
  }
  for (let index = 0; index < repeatCount; index++) {
    loader.push(load);
  }
  const responses = [];
  if (context.repeat?.type === models.RepeatOrder.parallel) {
    const responses = await Promise.all(loader.map(obj => obj()));
    for (const result of responses) {
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
  return mergeResponses(responses);
}

export function mergeResponses(responses: Array<models.HttpResponse>): models.HttpResponse | undefined {
  if (responses.length > 1) {
    const result: models.HttpResponse = cloneResponse(responses[0]);
    delete result.prettyPrintBody;
    delete result.rawBody;
    delete result.meta;
    delete result.timings;

    const parsedBody: {
      responses: Array<models.HttpResponse>;
      statusCount: Record<string, number>;
      count: number;
    } = {
      responses: [],
      statusCount: {},
      count: responses.length,
    };
    const responseTimings: Array<models.HttpTimings> = [];

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
      if (response.timings) {
        responseTimings.push(response.timings);
      }
      delete response.prettyPrintBody;
      delete response.parsedBody;
      delete response.rawBody;
      parsedBody.responses.push(cloneResponse(response));

      if (responseTimings.length > 0) {
        result.timings = mergeTimings(responseTimings);
      }
    }
    result.parsedBody = parsedBody;
    result.body = stringifySafe(parsedBody, 2);

    return result;
  }
  return responses.pop();
}

function mergeTimings(timings: Array<models.HttpTimings>): models.HttpTimings {
  const dns: Array<number> = [];
  const download: Array<number> = [];
  const firstByte: Array<number> = [];
  const request: Array<number> = [];
  const tcp: Array<number> = [];
  const tls: Array<number> = [];
  const total: Array<number> = [];
  const wait: Array<number> = [];
  for (const timing of timings) {
    dns.push(timing.dns || 0);
    download.push(timing.download || 0);
    firstByte.push(timing.firstByte || 0);
    request.push(timing.request || 0);
    tcp.push(timing.tcp || 0);
    tls.push(timing.tls || 0);
    total.push(timing.total || 0);
    wait.push(timing.wait || 0);
  }

  const sum = (arr: Array<number>) => {
    const filtered = arr.filter(obj => obj > 0);
    if (filtered.length > 0) {
      return filtered.reduce((prev, curr) => prev + curr, 0) / filtered.length;
    }
    return undefined;
  };

  return {
    dns: sum(dns),
    download: sum(download),
    firstByte: sum(firstByte),
    request: sum(request),
    tcp: sum(tcp),
    tls: sum(tls),
    total: sum(total),
    wait: sum(wait),
  };
}
