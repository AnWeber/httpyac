<p align="center">
<img src="https://raw.githubusercontent.com/AnWeber/httpyac/main/icon.png" alt="HttpYac Logo" />
</p>

# Http Yac - Yet another Rest Client

Command Line Interface for *.http and *.rest files

![example](https://raw.githubusercontent.com/AnWeber/httpyac/main/assets/cli.gif)

> This program is used to execute *.http files on the command line. These can be created most easily in [VSCode](https://marketplace.visualstudio.com/items?itemName=anweber.vscode-httpyac), [VSCodium](https://open-vsx.org/extension/anweber/vscode-httpyac) or [Theia](https://open-vsx.org/extension/anweber/vscode-httpyac).


## Installation

```
npm install -g httpyac
httpyac --version
```

## Commands

```shell
> httpyac --help

usage: httpyac [options...] <file or glob pattern>
       --all           execute all http requests in a http file
       --editor        enter a new request and execute it
  -e   --env           list of environemnts
       --filter        filter requests output (only-failed)
  -h   --help          help
       --insecure      allow insecure server connections when using ssl
  -i   --interactive   do not exit the program after request, go back to selection
       --json          use json output
  -l   --line          line of the http requests
  -n   --name          name of the http requests
  -o   --output        output format of response (short, body, headers, response, exchange, none)
       --output-failed output format of failed response (short, body, headers, response, exchange, none)
       --raw           prevent formatting of response body
  -r   --repeat        repeat count for requests
       --repeat-mode   repeat mode: sequential, parallel (default)
       --root          absolute path to root dir of project
  -s   --silent        log only request
       --timeout       maximum time allowed for connections
  -v   --verbose       make the operation more talkative
       --version       version of httpyac

```

> --editor option only works on linux and mac ([see](https://github.com/nodejs/node/issues/21771))


## Examples

```html
@user = doe
@password = 12345678

GET https://httpbin.org/basic-auth/{{user}}/{{password}}
Authorization: Basic {{user}} {{password}}

```

```html

fragment IOParts on Repository {
  description
  diskUsage
}

POST https://api.github.com/graphql
Content-Type: application/json
Authorization: Bearer {{git_api_key}}


query test($name: String!, $owner: String!) {
  repository(name: $name, owner: $owner) {
    name
    fullName: nameWithOwner
    ...IOParts
    forkCount
    stargazers(first: 5) {
        totalCount
        nodes {
            login
            name
        }
    }
    watchers {
        totalCount
    }
  }
}

{
    "name": "vscode-httpyac",
    "owner": "AnWeber"
}
```

> [more examples](https://github.com/AnWeber/httpyac/tree/main/examples)

A complete specification / documentation can be found [here](https://github.com/AnWeber/httpyac/tree/main/examples/README.md)


## Settings

To load the environment variables, the root folder of the project is automatically searched. The root folder is determined where a `package.json`, `.httpyac.json` or a folder `env` is searched.

The program can be configured either in the `.httpyac.json` file or in `the package.json` with `httpyac` key. See [interface](https://github.com/AnWeber/httpyac/blob/main/src/models/environmentConfig.ts) for supported settings.

> if the file has been newly created or changed, the program must be restarted or the environments must be reset/ reloaded


## Features

### send/ resend

Execute any REST, SOAP, and GraphQL queries of *.http Files on the command line

### variables

Built in support for variables and enviroments.
  * [dotenv](https://www.npmjs.com/package/dotenv) support
  * [intellij variable support](https://www.jetbrains.com/help/idea/exploring-http-syntax.html#environment-variables)
  * provide custom variables with scripts

### Manage Authentication

There are many authentications already built in
* OAuth2 / Open Id Connect
* Basic
* Digest
* AWS

Others can be added independently by means of scripting

### script support

enrich requests with custom scripts
  * create custom variables
  * add Custom Authentication to the requests
  * Node JS scripting support (pre request and post request)
  * Node JS require possible

### Intellij HTTP Client compatibility

*.http files of [Intellij HTTP Client](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html) can be parsed and executed


### VSCode, VSCodium and Theia support

develop *.http Files in VSCode with [vscode-httpyac](https://marketplace.visualstudio.com/items?itemName=anweber.vscode-httpyac) extension or use [VSCodium](https://open-vsx.org/extension/anweber/vscode-httpyac)


## License
[MIT License](LICENSE)

## Change Log
[CHANGELOG](CHANGELOG.md)
