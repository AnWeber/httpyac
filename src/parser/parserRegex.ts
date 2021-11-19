export const ParserRegex = {
  auth: {
    aws: /^\s*(aws)\s+(?<accessKeyId>[^\s]*)\s+(?<secretAccessKey>[^\s]*)\s*(token:\s*(?<token>[^\s]*))?\s*(region:\s*(?<region>[^\s]*))?\s*(service:\s*(?<service>[^\s]*))?\s*$/iu,
    basic: /^\s*(basic)\s+(?<user>[^\s]*)\s+(?<password>([^\s]+.*))$/iu,
    basicColon: /^\s*(basic)\s+(?<user>.*):(?<password>.*)$/iu,
    clientCert:
      /^\s*(cert:\s*(?<cert>[^\s]*)\s*)?(key:\s*(?<key>[^\s]*)\s*)?(pfx:\s*(?<pfx>[^\s]*)\s*)?(passphrase:\s*(?<passphrase>[^\s]*)\s*)?\s*$/u,
    digest: /^\s*(digest)\s+(?<user>[^\s]*)\s+(?<password>([^\s]+.*))$/iu,
    oauth2:
      /^\s*(?<type>openid|oauth2)(\s+(?<flow>client(_credentials)?|(authorization_)?code|device(_code)?|password|implicit|hybrid))?(\s+(?<variablePrefix>[^\s]*))?\s*((token_exchange)\s+(?<tokenExchangePrefix>[^\s]*))?\s*$/iu,
  },
  comment: {
    multilineEnd: /^\s*\*\/\s*$/u,
    multilineStart: /^\s*\/\*$/u,
    singleline: /^\s*\/\/\s*(?<comment>.*)\s*$/u,
  },
  emptyLine: /^\s*$/u,
  gql: {
    fileImport: /^\s*gql(\s+(?<name>[^\s(]+))?\s+<\s+(?<fileName>.+)\s*$/u,
    fragment: /^\s*(fragment)\s+(?<name>[^\s(]+)\s+on\s+/u,
    query: /^\s*(query|mutation)(\s+(?<name>[^\s(]+))?/u,
  },
  grpc: {
    proto: /^\s*proto\s+<\s+(?<fileName>.+)\s*$/u,
    grpcLine: /^\s*(GRPC|grpc)\s*(?<url>.+?)\s*$/u,
    grpcProtocol: /^\s*grpc:\/\/(?<url>.+?)\s*$/u,
    grpcUrl: /^\s*(grpc:\/\/)?(?<server>.+?)\/(?<service>[^/]+?)\/(?<method>[^/]+?)$/u,
    sslAuthorization: /^\s*(ssl)\s+(?<root>[^\s]*)\s+(?<cert>[^\s]*)\s+(?<key>[^\s]*)\s*$/iu,
  },
  stream: {
    websocketLine: /^\s*(ws|wss|websocket)\s*(?<url>.+?)\s*$/iu,
    websocketProtocol: /^\s*ws(s)?:\/\/(?<url>.+?)\s*$/u,
    mqttLine: /^\s*(mqtt|mqtts)\s*(?<url>.+?)\s*$/iu,
    mqttProtocol: /^\s*mqtt(s)?:\/\/(?<url>.+?)\s*$/u,
    eventSourceLine: /^\s*(sse|eventsource)\s*(?<url>.+?)\s*$/iu,
  },
  intellij: {
    import: /^\s*>\s+(?<fileName>[^\s{%}]+\s*)$/u,
    scriptEnd: /^\s*%\}\s*$/u,
    scriptSingleLine: /^\s*>\s+\{%\s*(?<script>.*)\s*%\}\s*$/u,
    scriptStart: /^\s*>\s+\{%\s*$/u,
  },
  javascript: {
    scriptStart:
      /^\s*\{\{(@js\s+)?(?<modifier>\+|@)?(?<event>(request|streaming|response|after|responseLogging)?)?\s*$/u,
    scriptEnd: /^\s*\}\}\s*$/u,
    scriptSingleLine: /\{{2}(.+?)\}{2}/gu,
  },
  meta: {
    all: /^\s*(#+|\/{2})/u,
    comment: /^\s*((#\s+)|(\/{2}))/u,
    delimiter: /^\s*#{3,}(?<title>.*)$/u,
    data: /^\s*(#+|\/{2,})\s+@(?<key>[^\s]*)(\s+)?"?(?<value>.*)?"?$/u,
    forOf: /^\s*for\s+(?<variable>.*)\s+of\s+(?<iterable>.*)\s*/u,
    for: /^\s*for\s*(?<counter>\d*)\s*$/u,
    while: /^\s*while\s*(?<expression>.*)\s*$/u,
    rateLimit:
      /^\s*(slot(:)?\s*(?<slot>[^\s]+))?\s*(minIdleTime(:)?\s*(?<minIdleTime>\d*))?\s*(max(:)?\s*(?<max>\d*)\s*expire(:)?\s*(?<expire>\d*))?\s*$/iu,
  },
  request: {
    fileImport: /^<(?:(?<injectVariables>@)(?<encoding>\w+)?)?\s+(?<fileName>.+?)\s*$/u,
    header: /^\s*(?<key>[\w-]+)\s*:\s*(?<value>.*?),?\s*$/u,
    headersSpread: /^\s*\.{3}(?<variableName>[^\s]+),?\s*$/u,
    queryLine: /^\s*(\?|&)([^=\s]+)=(.*)$/u,
    requestLine:
      /^\s*(?<method>GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE|PROPFIND|PROPPATCH|MKCOL|COPY|MOVE|LOCK|UNLOCK|CHECKOUT|CHECKIN|REPORT|MERGE|MKACTIVITY|MKWORKSPACE|VERSION-CONTROL|BASELINE-CONTROL)\s*(?<url>.+?)(\s+HTTP\/(?<version>(\S+)))?$/u,
    urlLine: /^\s*(\/).*$/u,
  },
  outputRedirection: /^\s*>>(?<force>!)?\s+(?<fileName>[^\s{%}]+\s*)$/u,
  responseLine: /^\s*HTTP\/(?<httpVersion>\S+)\s*(?<statusCode>[1-5][0-9][0-9])\s*(-)?\s*(?<statusMessage>.*)$/u,
  responseRef: /^\s*<>\s*(?<fileName>.+?)\s*$/u,
  variable: /^\s*@(?<key>[^\s=]*)\s*(?<operator>=\s*)"?(?<value>.*)"?\s*$/u,
};
