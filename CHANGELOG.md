## 4.10.2 (2022-02-08)

#### Features

- add Asciidoc Injection
- add testFactory to utils (#194)
- update to globby and clipboardy ESM Packages

#### Fix

- use device_code instead of code in OAuth2 Device Code Flow
- add more file extensions for Markdown Injection (Anweber/vscode-httpyac#102)

## 4.10.1 (2022-01-30)

#### Fix

- add fallback, if fsPath results in undefined/ error (AnWeber/httpbook#43)
- Error parsing grpc URL starting with grpc fixed (mistaken for protocol)

## 4.10.0 (2022-01-27)

#### Features

- use Host Header as Url Prefix (#189)
- add cookie to userSessionStore instead cookieStore
- `# @loop` allows actions before execution of the loop (e.g. ' # @ref ...`)
- use all dotenv files between httpfile directory and rootDir (#174)

#### Fix

- handle Windows directory separators in glob pattern (#175)

## 4.9.1 (2022-01-04)

#### Fix

- GRPC name resolution problem when the path was set (#158)

## 4.9.0 (2021-12-29)

#### Features

- support http codeblocks in markdown files (#164)
- add raw headers to httpResponse (#165)
- add special env setting `request_rejectUnauthorized` to ignore SSL Verification (#159)
- add special env setting `request_proxy` to set proxy (#159)
- proxy support of `socks://` proxy (AnWeber/vscode-httpyac#91)

## 4.8.2 (2021-12-19)

#### Fix

- replace all whitespace in meta data name and use camelCase instead of underscore (#154)
- support nested `envDirName` (AnWeber/vscode-httpyac#93)
- allow hyphens in variable name (AnWeber/vscode-httpyac#95)

## 4.8.1 (2021-12-10)

#### Fix

- really read all `*.env.json` as Intellij Environment Files (AnWeber/vscode-httpyac#94)

## 4.8.0 (2021-12-09)

#### Feature

- `@import` supports variable substitution (#151)
- render objects as JSON while replacing variables (#146)
- add httpResponse as named variable with `${name}Response` (#152)

#### Fix

- read all `*.env.json` as Intellij Environment Files (AnWeber/vscode-httpyac#94)
- Intellij `client.global.set` really changes variables for this run (#150)

## 4.7.4 (2021-12-05)

#### Feature

- add new Command `httpyac oauth2` to support output of OAuth2 JWT Token (#138)

#### Fix

- remove `??` to support NodeJS v12 (#123)
- oauth2 variables are expanded

## 4.7.3 (2021-11-30)

#### Feature

- add config setting for OAuth2 redirectUri (#118)
- add password variable replacer (#139)
- besides `$shared` there is now also the possibility to use `$default` in `config.environment`. These variables are only used if no environment is selected (#142)

#### Fix

- added two line endings instead of one in response body (httpyac/httpyac.github.io#13)
- add support for `.` in header name #128
- parsing error with `=` fixed cli command `--var`
- interpret all status codes <400 as valid OAuth2 return codes (#131)
- global hooks are now always used for all HttpRegions and also work correctly in httpbook (AnWeber/httpbook#39)

## 4.7.2 (2021-11-23)

#### Fix

- remove special handling of Authorization Header on grpc Requests (#125)
- GraphQL queries withouth variables are executed (#124)

## 4.7.1 (2021-11-17)

#### Fix

- .env file in same folder not imported #112
- blank header is now supported (#107)
- using `# @no-log` breaks named variable (#106)

## 4.7.0 (2021-11-10)

#### Features

- add new event `@responseLogging` for scripts
- add `--var` option to cli command

#### Fix

- refreshTokenFlow does not require refreshExpiresIn
- envDirName is not overriden in cli command (#103)

## 4.6.0 (2021-11-07)

#### Features

- added [OAuth 2.0 Device Authorization Grant](https://datatracker.ietf.org/doc/html/rfc8628) (#97)
- extend GRPC Not Found Service Error with avaiable services

#### Fix

- escape of `{{...}}` works again (#99)
- user cancelation stops execution hook (#98)

## 4.5.2 (2021-11-03)

#### Features

- config setting to use Region scoped variables (default: false)

## 4.5.1 (2021-11-01)

#### Features

- added `--bail` option to fail fast on test error

#### Fix

- return with exit code 1 if non existing endpoint is called (#95)

## 4.5.0 (2021-10-31)

#### Features

- $randomInt Variable Substitution allows negative numbers (#93)
- text after region delimiter is used as title and name ([Intellij IDEA Compatibility](https://blog.jetbrains.com/idea/2021/10/intellij-idea-2021-3-eap-6-enhanced-http-client-kotlin-support-for-cdi-and-more/))
- support output redirection like [Intellij IDEA Compatibility](https://blog.jetbrains.com/idea/2021/10/intellij-idea-2021-3-eap-6-enhanced-http-client-kotlin-support-for-cdi-and-more/)
- add rate limiter support with meta option (#52)

## 4.4.1 (2021-10-25)

#### Fix

- Body for GraphQL requests was replaced only after request

## 4.4.0 (2021-10-24)

#### Features

- add [WebSocket](https://httpyac.github.io/guide/request.html#websocket) support
- add [MQTT](https://httpyac.github.io/guide/request.html#mqtt) support
- add [Server-Sent Events](https://httpyac.github.io/guide/request.html#server-sent-events-eventsource) support
- HTTP header array support added
- added oauthSession2 Variable to directly access OAuth2 Token
- add additional Meta Data
  - `@verbose` to increase log level to `trace`
  - `@debug` to increase log level to `debug`
  - `@keepStreaming` of MQTT, Server-Sent-Events or WebSocket until the session is ended manually
  - `@sleep` supports variables
  - documentation of meta data added to outline view

## 4.3.0 (2021-10-15)

#### Features

- support comments between request line and headers
- update to @grpc/js v1.4.1

#### Fix

- pretty print max size too low, 1kb instead fo 1Mb (#84)
- cookies are not cleared while editing in vscode (AnWeber/vscode-httpyac#77)

## 4.2.1 (2021-10-11)

#### Fix

- infinte loop if `@ref` in `@import` disabled or not found

## 4.2.0 (2021-10-10)

#### Features

- accept output options for utils.toHttpString
- response in HttpRegion is deleted after run to optimize memory

#### Fix

- variables with `2` got not replaced in Javascript Substitution

## 4.1.1 (2021-10-06)

#### Fix

- environments in .httpyac.js are not recognized (AnWeber/vscode-httpyac#71)
- js keyword as variable name not allowed (#76)

## 4.1.0 (2021-10-02)

#### Features

- Variable Substitution for file import (proto, gql, request body)
- env Variables in `process.env.HTTPYAC_ENV` are loaded
- plugin in location `process.env.HTTPYAC_PLUGIN` is loaded
- OAuth2 Variable Substitution uses sensible default (flow = client_credentials, prefix = oauth2)

#### Fix

- protoLoaderOptions conversion added (#75)

## 4.0.5 (2021-09-30)

#### Fix

- removeHook is working

## 4.0.4 (2021-09-23)

#### Fix

- use esbuild instead of webpack. Fixes require error in @grpc/proto-loader
- stack overflow with multiple use of the same ref statement

## 4.0.3 (2021-09-22)

#### Fix

- entry point path fixed

## 4.0.2 (2021-09-22)

#### Fix

- remove test script in root folder (package import error in vscode-httpyac)

## 4.0.1 (2021-09-22)

#### Fix

- missing typescript types provided

## 4.0.0 (2021-09-22)

#### Features

- [gRPC Request support](https://httpyac.github.io/guide/request.html#grpc)
  - Unary RPC
  - Server Streaming
  - Client Streaming
  - Bi-Directional Streaming
- add meta option sleep (wait x milliseconds before request)
- Basic Authentication with Whitespace in username or password (`Basic {{username}}:{{password}}`)
- register script task for event hooks (streaming, request, response, after)

#### Fix

- input and quickpick variable replacer fixed

#### Breaking Changes

- changed variable replacer interface from string to unknown

```
before: (text: string, type: string, context: ProcessorContext): Promise<string>

after: (text: unknown, _type: string, context: ProcessorContext): Promise<unknown>
```

## 3.2.0 (2021-09-12)

#### Fix

- markdown requests supports sending heading
- fix detection of environments in cli usage
- fix import of http files in global context

## 3.1.0 (2021-08-09)

#### Features

- OAuth2 Variable Substitution can send client_id in body (config setting)
- change responseLogging to BailSeriesHook for simple use

## 3.0.0 (2021-08-09)

#### Breaking Changes

- removed extensionScript (use instead [hook api](https://httpyac.github.io/guide/hooks.html#project-local-hooks))
- removed dotenv and intellij configuration (use instead [envDirName](https://httpyac.github.io/config/#envdirname), if needed)

#### Features

- [httpyac plugin support](https://httpyac.github.io/plugins/#getting-started)
- [hook api support](https://httpyac.github.io/guide/hooks.html#project-local-hooks)
- [better documentation](https://httpyac.github.io/guide)
- [new location for examples](https://github.com/httpyac/httpyac.github.io/tree/main/examples)
- add requireUncached to script context to clear NodeJS Caching

## 2.21.1 (2021-07-28)

#### Fix

- log trace can be selected

## 2.21.0 (2021-07-22)

#### Features

- add new option `--raw` to prevent pretty print of body
- add pretty print for xml (Anweber/vscode-httpyac#56)

#### Fix

- missing blank line after file import in multipart/formdata (#57)

## 2.20.0 (2021-07-18)

#### Features

- advanced logging (#49)
  - `--output` and `--output-failed` option to [format output](https://github.com/AnWeber/httpyac#commands)
  - `--json` option to create json output
  - `--filter` option to output only-failed requests
  - added meta data `title` and `description` to extend information of the logging
  - added summary after executing more requests
- allow [loop](https://github.com/AnWeber/httpyac/blob/main/examples/metaData/loop.http) one requests multiple times with `for <var> of <iterable>`, `for <count>` or `while <condition>`

#### Fix

- error in dotenv import with `.env.{{system}}` notation (Anweber/vscode-httpyac#51)
- line break issue with comment in last line #56

## 2.19.0 (2021-07-09)

#### Features

- simple escaping of template strings in body with `\{\{...\}\}` (is replaced with `{{...}}`)
- add test result summary, if more requests are executed at the same time

## 2.18.1 (2021-07-06)

#### Fix

- fix error with global variables (Anweber/vscode-httpyac#48)

## 2.18.0 (2021-06-30)

#### Features

- add new meta data @noRejectUnauthorized, to disable ssl verification
- update filesize dependency

## 2.17.0 (2021-06-28)

#### Fix

- fixed parser, if global variable is used in first line (Anweber/vscode-httpyac#45)
- http2 needs to explicitly activated (second attempt:-))

## 2.16.0 (2021-06-20)

#### Fix

- error while using metadata followRedirect fixed
- http2 needs to explicitly activated

## 2.15.1 (2021-06-17)

#### Fix

- fix gql (wrong Execution Order)

## 2.15.0 (2021-06-13)

#### Features

- add default accept header _/_
- faster parsing with lazy access of fs

## 2.14.1 (2021-06-11)

#### Fix

- update normalize-url

## 2.14.0 (2021-06-06)

#### Features

- better test method support

#### Fix

- error parsing body in inline response

## 2.13.1 (2021-06-05)

#### Fix

- error parsing http version in inline response

## 2.13.0 (2021-06-05)

#### Features

- assertUtils for simple tests

#### Fix

- empty line after requestline not needed anymore

## 2.12.5 (2021-06-04)

#### Fix

- region delimiter ignore chars after delimiter

## 2.12.4 (2021-06-03)

#### Fix

- error on require local javascript file

## 2.12.3 (2021-06-01)

#### Fix

- fix types issue

## 2.12.2 (2021-06-01)

#### Fix

- error if ### on first line

## 2.12.1 (2021-05-30)

#### Fix

- Spelling mistake in symbol
- small error in Http version output

## 2.12.0 (2021-05-30)

#### Features

- change signature of responseRef array
- HttpSymbol provides property source
- utils for http file output

## 2.11.0 (2021-05-29)

#### Features

- add parser for response and responseRef

## 2.10.0 (2021-05-24)

#### Features

- dependency updates of open, inquirer and dotenv

## 2.9.0 (2021-05-18)

#### Features

- force inject variables with metadata setting (`# @injectVariables`)

## 2.8.0 (2021-05-13)

#### Features

- allow custom filesystem provider (e.g. vscode.workspaces.fs)
- add support for mimetype application/x-javascript
- update dotenv to 9.0.2

## 2.7.0 (2021-05-03)

#### Features

- all markdown utils exported
- reuse parser promise on same version and filename

#### Fix

- use shared env on empty environment array
- delimiter ignored on source of httpregion

## 2.6.0 (2021-05-01)

#### Features

- toMarkdown with better option support and style change
- httpClient is optional on httpyacApi.send

#### Fix

- incomplete httpRegion.source fixed

## 2.5.1 (2021-04-25)

#### Fix

- declaration support added

## 2.5.0 (2021-04-25)

#### Breaking Changes

- [Action](https://github.com/AnWeber/httpyac/blob/main/src/models/httpRegionAction.ts#L7) method changed to process instead of processor
- [VariableReplacer](https://github.com/AnWeber/httpyac/blob/main/src/models/variableReplacer.ts#L5) changed to object with replace method, to implement better trust support

#### Features

- better static code analysis
- interactive mode, which do not close cli command
- glob pattern support for filename
- rest client dynamic variable support ($guid, $randomInt, $timestamp, $datetime, $localDatetime, $processEnv, $dotenv)

#### Fix

- ref and forceRef support is fixed
- error on executing httpRegionScript

## 2.4.0 (2021-04-15)

#### Features

- better [test](https://github.com/AnWeber/httpyac/blob/main/examples/README.md#node-js-scripts) method support
- refactored response in script to [http response](https://github.com/AnWeber/httpyac/blob/main/src/models/httpResponse.ts) instead of body

#### Fix

- intellij env support enabled
- unnecessary file parse when using ref in vscode

## 2.3.1 (2021-04-11)

#### Features

- define response example in http file (ignored in parsing file)
- using chalk for ansi support

#### Fix

- dotenv support accidentally disabled

## 2.3.0 (2021-04-09)

#### Features

- define global script executed after every request
- set ssl client certifcates per request
- intellij syntax support for metadata (`// @no-cookie-jar`)
- markdown utils in httpyac

#### Fix

- priority of config initialization adjusted ([#3](https://github.com/AnWeber/httpyac/issues/3))

## 2.2.1 (2021-04-05)

#### Fix

- minimize size of webpack build

## 2.2.0 (2021-04-05)

#### Feature

- support for ssl client certficates
- note http version (version 1.1 disables http2 support)
- cookiejar support

## 2.1.0 (2021-03-30)

#### Feature

- --version option in cli command

### Fix

- error in signing request with aws

## 2.0.0 (2021-03-27)

#### Feature

- cli support with [httpyac cli](https://www.npmjs.com/package/httpyac)
