<p align="center">
<img src="https://httpyac.github.io/favicon.png" alt="HttpYac" />
</p>

# httpYac - Yet another Rest Client

> httpyac CLI provides a command line interface to execute *.http and *.rest files. This can be used to quickly execute a single *.http file, but also to execute all files in a folder. httpyac supports HTTP, Rest, GraphQL, WebSocket und gRPC Requests

<p align="center">
<a href="https://httpyac.github.io/">
<img src="https://httpyac.github.io/httpyac_site.png" alt="HttpYac" />
</a>
<img src="https://raw.githubusercontent.com/AnWeber/httpyac/main/assets/cli.gif" alt="HttpYac CLI" />
</p>

## Installation

```shell
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
       --no-color      disable color support
  -o   --output        output format of response (short, body, headers, response, exchange, none)
       --output-failed output format of failed response (short, body, headers, response, exchange, none)
       --raw           prevent formatting of response body
  -r   --repeat        repeat count for requests
       --repeat-mode   repeat mode: sequential, parallel (default)
  -s   --silent        log only request
       --timeout       maximum time allowed for connections
  -v   --verbose       make the operation more talkative
       --version       version of httpyac

```

> --editor option only works on linux and mac ([see](https://github.com/nodejs/node/issues/21771))


## Example

```http
@user = doe
@password = 12345678

GET https://httpbin.org/basic-auth/{{user}}/{{password}}
Authorization: Basic {{user}} {{password}}

```

more [examples](https://httpyac.github.io/guide/examples) and [guide](https://httpyac.github.io/guide/)


## License
[MIT License](LICENSE)

## Change Log
[CHANGELOG](CHANGELOG.md)
