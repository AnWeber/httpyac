import { createHash } from 'crypto';

import * as utils from '../../../utils';
import { TestPredicate } from './testPredicate';

export class MD5Predicate implements TestPredicate {
  readonly id = ['md5'];
  noAutoConvert = true;
  match(value: unknown, expected: unknown): boolean {
    const val = utils.toBufferLike(value);
    if (val) {
      const hash = createHash('md5').update(val).digest('base64');
      return hash === expected;
    }
    return false;
  }
}
