## 2.5.0 (2021-04-24)

#### Breaking Changes

* [Action](https://github.com/AnWeber/httpyac/blob/main/src/models/httpRegionAction.ts#L7) method changed to process instead of processor
*  [VariableReplacer](https://github.com/AnWeber/httpyac/blob/main/src/models/variableReplacer.ts#L5) changed to object with replace method, to implement better trust support
#### Features

* better static code analysis
* interactive mode, which do not close cli command
* glob pattern support for filename

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
