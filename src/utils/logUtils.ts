import { log } from '../io';
import * as models from '../models';

export function report(context: { progress?: models.Progress }, message: string) {
  log.debug(message);
  context.progress?.report?.({
    message,
  });
}
