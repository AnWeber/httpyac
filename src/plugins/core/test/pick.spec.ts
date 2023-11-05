import { userInteractionProvider } from '../../../io';
import { initFileProvider, sendHttp } from '../../../test/testUtils';

describe('variables.pick', () => {
  userInteractionProvider.showListPrompt = async () => 'foo';

  it('pick', async () => {
    initFileProvider();
    const spy = jest.spyOn(userInteractionProvider, 'showListPrompt');
    const variables: Record<string, unknown> = {};

    await sendHttp(
      `
  @var1={{ $pick pick me? $value: foo,bar }}
    `,
      variables
    );

    expect(spy).toHaveBeenCalledWith('pick me?', ['foo', 'bar']);
    expect(variables.var1).toBe('foo');
  });
  it('pick-askonce', async () => {
    initFileProvider();
    const spy = jest.spyOn(userInteractionProvider, 'showListPrompt');
    const variables: Record<string, unknown> = {};

    await sendHttp(
      `
@var1={{ $pick-askonce ask-once? $value: foo,bar }}
@var2={{ $pick-askonce ask-once? $value: foo,bar }}
    `,
      variables
    );

    expect(spy).toHaveBeenCalledWith('ask-once?', ['foo', 'bar']);
    expect(variables.var1).toEqual('foo');
    expect(variables.var2).toEqual('foo');
  });
  it('pick-variables', async () => {
    initFileProvider();
    const spy = jest.spyOn(userInteractionProvider, 'showListPrompt');
    const variables: Record<string, unknown> = {};

    await sendHttp(
      `
{{
  exports.data = ["foo", "bar"];
}}
@var1={{ $pick ask-variable? $value: data }}
    `,
      variables
    );

    expect(spy).toHaveBeenCalledWith('ask-variable?', ['foo', 'bar']);
    expect(variables.var1).toEqual('foo');
  });
});
