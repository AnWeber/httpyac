export const ParserRegex = {
  auth: {
    aws: /^\s*(aws)\s+(?<accessKeyId>[^\s]*)\s+(?<secretAccessKey>[^\s]*)\s*(token:\s*(?<token>[^\s]*))?\s*(region:\s*(?<region>[^\s]*))?\s*(service:\s*(?<service>[^\s]*))?\s*$/iu,
    basic: /^\s*(basic)\s+(?<user>[^\s]*)\s+(?<password>([^\s]+.*))$/iu,
    clientCert: /^\s*(cert:\s*(?<cert>[^\s]*)\s*)?(key:\s*(?<key>[^\s]*)\s*)?(pfx:\s*(?<pfx>[^\s]*)\s*)?(passphrase:\s*(?<passphrase>[^\s]*)\s*)?\s*$/u,
    digest: /^\s*(digest)\s+(?<user>[^\s]*)\s+(?<password>([^\s]+.*))$/iu,
    oauth2: /^\s*(openid|oauth2)\s+(?<flow>[^\s]*)\s+(?<variablePrefix>[^\s]*)\s*((token_exchange)\s+(?<tokenExchangePrefix>[^\s]*))?\s*$/iu,
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
  intellij: {
    import: /^\s*>\s+(?<fileName>[^\s{%}]+\s*)$/u,
    scriptEnd: /^\s*%\}\s*$/u,
    scriptSingleLine: /^\s*>\s+\{%\s*(?<script>.*)\s*%\}\s*$/u,
    scriptStart: /^\s*>\s+\{%\s*$/u,
  },
  javascript: {
    scriptStart: /^\s*\{\{(?<executeOnEveryRequest>\+(pre|post|after)?)?\s*$/u,
    scriptEnd: /^\s*\}\}\s*$/u,
  },
  meta: {
    all: /^\s*(#+|\/{2})/u,
    delimiter: /^\s*#{3,}(?<description>.*)$/u,
    data: /^\s*(#+|\/{2,})\s+@(?<key>[^\s]*)(\s+)?"?(?<value>.*)?"?$/u,
  },
  request: {
    fileImport: /^<(?:(?<injectVariables>@)(?<encoding>\w+)?)?\s+(?<fileName>.+?)\s*$/u,
    header: /^\s*(?<key>[\w-]+)\s*:\s*(?<value>.*?)\s*$/u,
    headersSpread: /^\s*\.{3}(?<variableName>[^\s]+)\s*$/u,
    queryLine: /^\s*(\?|&)([^=\s]+)=(.*)$/u,
    requestLine: /^\s*(?<method>GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE|PROPFIND|PROPPATCH|MKCOL|COPY|MOVE|LOCK|UNLOCK|CHECKOUT|CHECKIN|REPORT|MERGE|MKACTIVITY|MKWORKSPACE|VERSION-CONTROL|BASELINE-CONTROL)\s*(?<url>.+?)(\s+HTTP\/(?<version>(\S+)))?$/u,
    urlLine: /^\s*(\/).*$/u,
  },
  responseLine: /^\s*HTTP\/(?<httpVersion>\S+)\s*(?<statusCode>[1-5][0-9][0-9])\s*(-)?\s*(?<statusMessage>.*)$/u,
  responseRef: /^\s*<>\s*(?<fileName>.+?)\s*$/u,
  variable: /^\s*@(?<key>[^\s=]*)\s*(?<operator>=\s*)"?(?<value>.*)"?\s*$/u,
};
