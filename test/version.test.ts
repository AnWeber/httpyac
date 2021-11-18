import { cli } from '../src';
import * as utils from '../src/utils/configUtils';

describe('version', () => {
  it('should print version', async () => {
    jest.spyOn(utils, 'parseJson').mockResolvedValue({ version: '1.2.3' });
    const spy = jest.spyOn(console, 'info');

    await cli.execute([
      '',
      '',
      '--version'
    ]);

    expect(spy).toHaveBeenCalledWith('httpyac v1.2.3');
  });
});
