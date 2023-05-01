import { userInteractionProvider } from '../../io';
import { initFileProvider, sendHttp } from '../testUtils';
import { getLocal } from 'mockttp';

describe('variables.pick', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(6001));
  afterEach(() => localServer.stop());
  userInteractionProvider.showListPrompt = async () => 'foo';

  it('pick', async () => {
    initFileProvider();
    const spy = jest.spyOn(userInteractionProvider, 'showListPrompt');
    const variables = {};

    await sendHttp(
      `
  @var1={{ $pick pick me? $value: foo,bar }}
    `,
      variables
    );

    expect(spy).toHaveBeenCalledWith('pick me?', ['foo', 'bar']);
    expect(variables).toEqual({
      $global: {},
      var1: 'foo',
    });
  });
  it('pick-askonce', async () => {
    initFileProvider();
    const spy = jest.spyOn(userInteractionProvider, 'showListPrompt');
    const variables = {};

    await sendHttp(
      `
@var1={{ $pick-askonce ask-once? $value: foo,bar }}
@var2={{ $pick-askonce ask-once? $value: foo,bar }}
    `,
      variables
    );

    expect(spy).toHaveBeenCalledWith('ask-once?', ['foo', 'bar']);
    expect(variables).toEqual({
      $global: {},
      var1: 'foo',
      var2: 'foo',
    });
  });
});
