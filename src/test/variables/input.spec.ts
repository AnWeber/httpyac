import { userInteractionProvider } from '../../io';
import { initFileProvider, sendHttp } from '../testUtils';

describe('variables.input', () => {
  it('input', async () => {
    initFileProvider();
    userInteractionProvider.showInputPrompt = jest.fn();
    const spy = jest.spyOn(userInteractionProvider, 'showInputPrompt');

    await sendHttp(`
@test={{ $input Auth Token? $value: jwt.something }}
    `);

    expect(spy).toHaveBeenCalledWith('Auth Token?', 'jwt.something', false);
  });
  it('password', async () => {
    initFileProvider();
    userInteractionProvider.showInputPrompt = jest.fn();
    const spy = jest.spyOn(userInteractionProvider, 'showInputPrompt');

    await sendHttp(`
@test={{ $password Auth Token? $value: jwt.something }}
    `);

    expect(spy).toHaveBeenCalledWith('Auth Token?', 'jwt.something', true);
  });
  it('input-askonce', async () => {
    initFileProvider();
    userInteractionProvider.showInputPrompt = async msg => msg;
    const spy = jest.spyOn(userInteractionProvider, 'showInputPrompt');

    await sendHttp(`
@test={{ $input-askonce Auth Token? $value: jwt.something }}
@test2={{ $input-askonce Auth Token? $value: jwt.something }}
    `);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('Auth Token?', 'jwt.something', false);
  });
  it('password-askonce', async () => {
    initFileProvider();
    userInteractionProvider.showInputPrompt = async msg => msg;
    const spy = jest.spyOn(userInteractionProvider, 'showInputPrompt');

    await sendHttp(`
@test={{ $password-askonce Password Token? $value: jwt.something }}
@test2={{ $password-askonce Password Token? $value: jwt.something }}
    `);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('Password Token?', 'jwt.something', true);
  });
});
