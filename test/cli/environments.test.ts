import { cli } from '../../src';
import { getLocal } from 'mockttp';

describe('environments', () => {
  const mockServer = getLocal();

  beforeEach(() => mockServer.start(8080));
  afterEach(() => mockServer.stop());
  jest.spyOn(process, 'exit').mockImplementation();
  jest.spyOn(console, 'info').mockImplementation();
  it('should pick up test environment', async () => {
    const endpointMock = await mockServer.get('/').thenReply(200, 'OK');

    await cli.execute(['', '', '**/environments.http', '--all', '--env', 'environments']);
    const requests = await endpointMock.getSeenRequests();
    expect(requests.length).toEqual(1);
  });
});
