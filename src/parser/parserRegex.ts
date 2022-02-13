export const ParserRegex = {
  auth: {
    aws: /^\s*(aws)\s+(?<accessKeyId>[^\s]*)\s+(?<secretAccessKey>[^\s]*)\s*(token:\s*(?<token>[^\s]*))?\s*(region:\s*(?<region>[^\s]*))?\s*(service:\s*(?<service>[^\s]*))?\s*$/iu,
    basic: /^\s*(basic)\s+(?<user>[^\s]*)\s+(?<password>([^\s]+.*))$/iu,
    basicColon: /^\s*(basic)\s+(?<user>.*):(?<password>.*)$/iu,
    clientCert:
      /^\s*(cert:\s*(?<cert>[^\s]*)\s*)?(key:\s*(?<key>[^\s]*)\s*)?(pfx:\s*(?<pfx>[^\s]*)\s*)?(passphrase:\s*(?<passphrase>[^\s]*)\s*)?\s*$/u,
  },
  comment: {
    multilineEnd: /^\s*\*\/\s*$/u,
    multilineStart: /^\s*\/\*$/u,
    singleline: /^\s*\/\/\s*(?<comment>.*)\s*$/u,
  },
  gql: {
    fileImport: /^\s*gql(\s+(?<name>[^\s(]+))?\s+<\s+(?<fileName>.+)\s*$/u,
    fragment: /^\s*(fragment)\s+(?<name>[^\s(]+)\s+on\s+/u,
    query: /^\s*(query|mutation)(\s+(?<name>[^\s(]+))?/u,
  },
  javascript: {
    scriptStart:
      /^\s*\{\{(@js\s+)?(?<modifier>\+|@)?(?<event>(request|streaming|response|after|responseLogging)?)?\s*$/iu,
    scriptEnd: /^\s*\}\}\s*$/u,
    scriptSingleLine: /\{{2}(.+?)\}{2}/gu,
  },
  meta: {
    all: /^\s*(#+|\/{2})/u,
    delimiter: /^\s*#{3,}(?<title>.*)$/u,
  },
  request: {
    requestLine:
      /^\s*(?<method>GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE|PROPFIND|PROPPATCH|MKCOL|COPY|MOVE|LOCK|UNLOCK|CHECKOUT|CHECKIN|REPORT|MERGE|MKACTIVITY|MKWORKSPACE|VERSION-CONTROL|BASELINE-CONTROL)\s*(?<url>.+?)(\s+HTTP\/(?<version>(\S+)))?$/u,
  },
  outputRedirection: /^\s*>>(?<force>!)?\s+(?<fileName>[^\s{%}]+\s*)$/u,
  responseLine: /^\s*HTTP\/(?<httpVersion>\S+)\s*(?<statusCode>[1-5][0-9][0-9])\s*(-)?\s*(?<statusMessage>.*)$/u,
  responseRef: /^\s*<>\s*(?<fileName>.+?)\s*$/u,
  variable: /^\s*@(?<key>[^\s=]*)\s*(?<operator>=\s*)"?(?<value>.*)"?\s*$/u,
};
