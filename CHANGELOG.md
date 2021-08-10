## 3.1.0 (2021-08-09)

#### Features
* OAuth2 Variable Substitution can send client_id in body (config setting)
* change responseLogging to BailSeriesHook for simple use

## 3.0.0 (2021-08-09)

#### Breaking Changes
* removed extensionScript (use instead [hook api](https://httpyac.github.io/guide/hooks.html#project-local-hooks))
* removed dotenv and intellij configuration (use instead [envDirName](https://httpyac.github.io/config/#envdirname), if needed)

#### Features
* [httpyac plugin support](https://httpyac.github.io/plugins/#getting-started)
* [hook api support](https://httpyac.github.io/guide/hooks.html#project-local-hooks)
* [better documentation](https://httpyac.github.io/guide)
* [new location for examples](https://github.com/httpyac/httpyac.github.io/tree/main/examples)
* add requireUncached to script context to clear NodeJS Caching

## 2.21.1 (2021-07-28)

#### Fix
* log trace can be selected

## 2.21.0 (2021-07-22)

#### Features
* add new option `--raw` to prevent pretty print of body
* add pretty print for xml (Anweber/vscode-httpyac#56)

#### Fix
* missing blank line after file import in multipart/formdata (#57)


## 2.20.0 (2021-07-18)

#### Features
* advanced logging (#49)
  * `--output` and `--output-failed` option to [format output](https://github.com/AnWeber/httpyac#commands)
  * `--json` option to create json output
  * `--filter` option to output only-failed requests
  * added meta data `title` and `description` to extend information of the logging
  * added summary after executing more requests
* allow [loop](https://github.com/AnWeber/httpyac/blob/main/examples/metaData/loop.http) one requests multiple times with `for <var> of <iterable>`, `for <count>` or `while <condition>`

#### Fix
* error in dotenv import with `.env.{{system}}` notation (Anweber/vscode-httpyac#51)
* line break issue with comment in last line #56

## 2.19.0 (2021-07-09)

#### Features
* simple escaping of template strings in body with `\{\{...\}\}` (is replaced with `{{...}}`)
* add test result summary, if more requests are executed at the same time

## 2.18.1 (2021-07-06)

#### Fix
* fix error with global variables (Anweber/vscode-httpyac#48)

## 2.18.0 (2021-06-30)

#### Features
* add new meta data @noRejectUnauthorized, to disable ssl verification
* update filesize dependency

## 2.17.0 (2021-06-28)

#### Fix
* fixed parser, if global variable is used in first line (Anweber/vscode-httpyac#45)
* http2 needs to explicitly activated (second attempt:-))

## 2.16.0 (2021-06-20)

#### Fix
* error while using metadata followRedirect fixed
* http2 needs to explicitly activated

## 2.15.1 (2021-06-17)

#### Fix
* fix gql (wrong Execution Order)

## 2.15.0 (2021-06-13)

#### Features
* add default accept header */*
* faster parsing with lazy access of fs

## 2.14.1 (2021-06-11)

#### Fix
* update normalize-url

## 2.14.0 (2021-06-06)

#### Features
* better test method support

#### Fix
* error parsing body in inline response

## 2.13.1 (2021-06-05)

#### Fix
* error parsing http version in inline response

## 2.13.0 (2021-06-05)

#### Features
* assertUtils for simple tests

#### Fix
* empty line after requestline not needed anymore

## 2.12.5 (2021-06-04)

#### Fix
* region delimiter ignore chars after delimiter

## 2.12.4 (2021-06-03)

#### Fix
* error on require local javascript file

## 2.12.3 (2021-06-01)

#### Fix
* fix types issue

## 2.12.2 (2021-06-01)

#### Fix
* error if ### on first line

## 2.12.1 (2021-05-30)

#### Fix
* Spelling mistake in symbol
* small error in Http version output

## 2.12.0 (2021-05-30)

#### Features
* change signature of responseRef array
* HttpSymbol provides property source
* utils for http file output
## 2.11.0 (2021-05-29)

#### Features
* add parser for response and responseRef

## 2.10.0 (2021-05-24)

#### Features
* dependency updates of open, inquirer and dotenv

## 2.9.0 (2021-05-18)

#### Features
* force inject variables with metadata setting (`# @injectVariables`)

## 2.8.0 (2021-05-13)

#### Features
* allow custom filesystem provider (e.g. vscode.workspaces.fs)
* add support for mimetype application/x-javascript
* update dotenv to 9.0.2

## 2.7.0 (2021-05-03)

#### Features
* all markdown utils exported
* reuse parser promise on same version and filename

#### Fix
* use shared env on empty environment array
* delimiter ignored on source of httpregion

## 2.6.0 (2021-05-01)

#### Features
* toMarkdown with better option support and style change
* httpClient is optional on httpyacApi.send

#### Fix
* incomplete httpRegion.source fixed

## 2.5.1 (2021-04-25)

#### Fix

* declaration support added
## 2.5.0 (2021-04-25)

#### Breaking Changes

* [Action](https://github.com/AnWeber/httpyac/blob/main/src/models/httpRegionAction.ts#L7) method changed to process instead of processor
*  [VariableReplacer](https://github.com/AnWeber/httpyac/blob/main/src/models/variableReplacer.ts#L5) changed to object with replace method, to implement better trust support
#### Features

* better static code analysis
* interactive mode, which do not close cli command
* glob pattern support for filename
* rest client dynamic variable support ($guid, $randomInt, $timestamp, $datetime, $localDatetime, $processEnv, $dotenv)

#### Fix

* ref and forceRef support is fixed
* error on executing httpRegionScript

## 2.4.0 (2021-04-15)

#### Features

* better [test](https://github.com/AnWeber/httpyac/blob/main/examples/README.md#node-js-scripts) method support
* refactored response in script to [http response](https://github.com/AnWeber/httpyac/blob/main/src/models/httpResponse.ts) instead of body

#### Fix

* intellij env support enabled
* unnecessary file parse when using ref in vscode

## 2.3.1 (2021-04-11)

#### Features

* define response example in http file (ignored in parsing file)
* using chalk for ansi support

#### Fix

* dotenv support accidentally disabled

## 2.3.0 (2021-04-09)

#### Features

* define global script executed after every request
* set ssl client certifcates per request
* intellij syntax support for metadata (`// @no-cookie-jar`)
* markdown utils in httpyac

#### Fix

* priority of config initialization adjusted ([#3](https://github.com/AnWeber/httpyac/issues/3))

## 2.2.1 (2021-04-05)

#### Fix

* minimize size of webpack build

## 2.2.0 (2021-04-05)

#### Feature

* support for ssl client certficates
* note http version (version 1.1 disables http2 support)
* cookiejar support


## 2.1.0 (2021-03-30)

#### Feature

* --version option in cli command

### Fix

* error in signing request with aws

## 2.0.0 (2021-03-27)

#### Feature

* cli support with [httpyac cli](https://www.npmjs.com/package/httpyac)
