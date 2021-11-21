import { cli } from '..';
import test from 'ava';
import * as utils from '../utils/configUtils';
import sinon from 'sinon';

test('should print version', async t => {
  sinon.stub(utils, 'parseJson').callsFake(() => Promise.resolve({ version: '1.2.3' }));
  const spy = sinon.spy(console, 'info');

  await cli.execute([
    '',
    '',
    '--version'
  ]);

  t.true(spy.calledWith('httpyac v1.2.3'));
});
