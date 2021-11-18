import path from 'path';
import { cli } from '../src';
import * as httpClientFactory from '../src/io/gotHttpClientFactory';

describe('environments', () => {
  jest.spyOn(process, 'exit').mockImplementation();
  it('should pick up test environment', async () => {
    const mockFactory = jest.fn();
    jest
      .spyOn(httpClientFactory, 'initHttpClient')
      .mockImplementation(() => mockFactory);

    await cli.execute([
      '',
      '',
      path.join(__dirname, '/spacex.http'),
      '--all',
      '--env',
      'test',
    ]);

    expect(mockFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.spacexdata.com/v4/launches/latest',
      }),
      expect.any(Object)
    );
  });
});
