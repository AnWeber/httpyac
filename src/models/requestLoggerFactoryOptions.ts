export interface RequestLoggerFactoryOptions {
  useShort?: boolean;
  requestOutput?: boolean;
  requestHeaders?: boolean;
  requestBodyLength?: number;
  responseHeaders?: boolean;
  responseBodyPrettyPrint?: boolean;
  responseBodyLength?: number;
  timings?: boolean;
  onlyFailed?: boolean;
}
