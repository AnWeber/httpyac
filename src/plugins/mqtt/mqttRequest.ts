import { Request } from '../../models';
import { IClientOptions as MQTTOptions } from 'mqtt';

export interface MQTTRequest extends Request<'MQTT'> {
  headers?: Record<string, string | string[] | undefined> | undefined;
  body?: string;
  options?: MQTTOptions;
}

export function isMQTTRequest(request: Request | undefined): request is MQTTRequest {
  return request?.protocol === 'MQTT';
}
