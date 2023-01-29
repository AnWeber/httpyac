import { Request } from '../../models';
import { KafkaConfig } from 'kafkajs';

export interface KafkaRequest extends Request<string> {
  headers?: Record<string, string | string[] | undefined> | undefined;
  body?: string | Buffer;
  options?: KafkaConfig;
}

export function isKafkaRequest(request: Request | undefined): request is KafkaRequest {
  return request?.protocol === 'KAFKA';
}
