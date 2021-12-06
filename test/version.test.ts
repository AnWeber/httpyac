import * as utils from '../src/utils/configUtils';
import { createProgram } from '@/cli';

describe('version', () => {
  it('should print version', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    jest.spyOn(process, 'exit').mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
    jest.spyOn(utils, 'parseJson').mockResolvedValue({ version: '1.2.3' });

    const program = await createProgram();

    await program.parse(['--version'], { from: 'user' });

    expect(mockStdout).toHaveBeenCalledWith('1.2.3\n');
  });
});
