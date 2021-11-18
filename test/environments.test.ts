import path from 'path';
import { cli } from '../src';
describe('environments', () => {
  it('should pick up dev environment', async () => {
    jest.spyOn(process, 'exit').mockImplementation();
    await cli.execute(['', '', path.join(__dirname, '/spacex.http'), '--all', '--env', 'dev']);
  });
});
