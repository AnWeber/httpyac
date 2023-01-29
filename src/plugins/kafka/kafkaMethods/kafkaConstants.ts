import { utils } from '../../..';
import { KafkaRequest } from '../kafkaRequest';

export const KafkaMethod = 'kafka_method';

export function getKafkaMethod(request: KafkaRequest) {
  let method = utils.getHeaderString(request.headers, KafkaMethod);
  if (!method) {
    if (request.body) {
      method = 'publish';
    } else {
      method = 'consume';
    }
  }
  return method;
}
