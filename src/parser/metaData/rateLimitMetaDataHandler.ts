import { log } from '../../io';
import * as models from '../../models';
import { userSessionStore } from '../../store';
import * as utils from '../../utils';
import { ParserRegex } from '../parserRegex';

export function rateLimitMetaDataHandler(
  type: string,
  value: string | undefined,
  { httpRegion }: models.ParserContext
) {
  if (type === 'ratelimit' && value) {
    const match = ParserRegex.meta.rateLimit.exec(value);
    if (match?.groups) {
      const slot = match.groups.slot || 'rateLimit';
      const minIdleTime = match.groups.minIdleTime || '0';
      const max = match.groups.max || '0';
      const expire = match.groups.expire || '0';

      httpRegion.hooks.execute.addHook('rateLimit', async context => {
        const rateLimitSession = getRateLimitSession(
          slot,
          Number.parseInt(minIdleTime, 10),
          Number.parseInt(max, 10),
          Number.parseInt(expire, 10)
        );

        rateLimitSession.requests.push(await checkRateLimit(rateLimitSession, context));
        return true;
      });
    }
  }
  return false;
}

async function checkRateLimit(rateLimitSession: RateLimitSession, context: models.ProcessorContext) {
  while (rateLimitSession.requests.length > 0) {
    const currentRequest = new Date();
    removeExpiredRequests(rateLimitSession.requests, currentRequest, rateLimitSession.expire);

    if (rateLimitSession.max > 0 && rateLimitSession.requests.length >= rateLimitSession.max) {
      const first = rateLimitSession.requests[0];
      const freeSlotTime = rateLimitSession.expire + first.getTime() - currentRequest.getTime();

      if (freeSlotTime > 0) {
        utils.report(context, `rate limit max reached. wait for ${freeSlotTime}`);
        log.debug(`rate limit max reached. wait for ${freeSlotTime} (slot ${rateLimitSession.slot})`);
        await utils.sleep(freeSlotTime);
        log.trace('rate limit max waited');
      }
      continue;
    }
    if (rateLimitSession.requests.length > 0) {
      const lastRequest = rateLimitSession.requests[rateLimitSession.requests.length - 1];
      if (lastRequest && rateLimitSession.minIdleTime > 0) {
        const minIdleTime = lastRequest.getTime() + rateLimitSession.minIdleTime - currentRequest.getTime();
        if (minIdleTime > 0) {
          utils.report(context, `rate limit minIdleTime, wait for ${minIdleTime}`);
          log.debug(`rate limit minIdleTime, wait for ${minIdleTime} (slot ${rateLimitSession.slot})`);
          await utils.sleep(minIdleTime);
          log.trace('rate limit minIdleTime waited');
          continue;
        }
      }
    }
    return currentRequest;
  }
  return new Date();
}

interface RateLimitSession extends models.UserSession {
  slot: string;
  minIdleTime: number;
  max: number;
  expire: number;
  lastRequest?: Date;
  requests: Array<Date>;
}

function isRateLimitSession(session: unknown): session is RateLimitSession {
  const rateLimitSession = session as RateLimitSession;
  return !!rateLimitSession?.requests && rateLimitSession.type === 'RateLimit';
}

function getRateLimitSession(slot: string, minIdleTime: number, max: number, expire: number) {
  const sessionId = `ratelimit_${slot}`;
  const session = userSessionStore.getUserSession(sessionId);

  if (isRateLimitSession(session)) {
    session.max = max;
    session.minIdleTime = minIdleTime;
    session.expire = expire;
    return session;
  }

  const description = [];
  if (minIdleTime > 0) {
    description.push(`minIdleTime ${minIdleTime}ms`);
  }
  if (expire > 0) {
    description.push(`max ${max} with expire ${expire}ms`);
  }

  const result: RateLimitSession = {
    id: sessionId,
    type: 'RateLimit',
    title: `rate limit slot ${slot}`,
    details: {
      slot,
      minIdleTime,
      max,
      expire,
    },
    description: description.join(', '),
    slot,
    minIdleTime,
    max,
    expire,
    requests: [],
  };
  userSessionStore.setUserSession(result);
  return result;
}

function removeExpiredRequests(requests: Array<Date>, current: Date, expire: number) {
  if (expire > 0) {
    let index = 0;
    for (const request of requests) {
      if (current.getTime() - request.getTime() >= expire) {
        index++;
      } else {
        break;
      }
    }
    requests.splice(0, index);
  } else {
    requests.splice(0, requests.length - 1);
  }
}
