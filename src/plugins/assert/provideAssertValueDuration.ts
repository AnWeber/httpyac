import * as models from '../../models';

export function provideAssertValueDuration(type: string, value: string | undefined, response: models.HttpResponse) {
  if (type === 'duration') {
    switch (value) {
      case 'firstByte':
        return response?.timings?.firstByte;
      case 'download':
        return response?.timings?.download;
      case 'wait':
        return response?.timings?.wait;
      case 'request':
        return response?.timings?.request;
      case 'tcp':
        return response?.timings?.tcp;
      case 'tls':
        return response?.timings?.tls;
      default:
        return response?.timings?.total;
    }
  }
  return false;
}
