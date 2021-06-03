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
