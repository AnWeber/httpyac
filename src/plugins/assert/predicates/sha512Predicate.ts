import { createHash } from 'crypto';

import * as utils from '../../../utils';
import { TestPredicate } from './testPredicate';

export class SHA512Predicate implements TestPredicate {
  readonly id = ['sha512'];
  noAutoConvert = true;
  match(value: unknown, expected: unknown): boolean {
    const val = utils.toBufferLike(value);
    if (val) {
      const hash = createHash('sha512').update(val).digest('base64');
      return hash === expected;
    }
    return false;
  }
}
