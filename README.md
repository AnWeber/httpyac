<p align="center">
<img src="https://httpyac.github.io/favicon.png" alt="HttpYac" />
</p>

# HttpYac (ZW edition)

This edition is based on the fantastic work of the original author, [Andreas Weber](https://github.com/AnWeber). The original project is not maintained frequently, and this fork provides additional features and updates.

### ZW edition updates

- Added `QUERY` request method support.
- Added Kafka support: produce, consume, commit and seek. See the [Kafka guide](docs/wiki/Guide-Kafka.md).
- Added file comparison asserts `matchesFile` and `matchesJsonFile`. See [Assert](docs/wiki/Guide-Assert.md).
- Reworked the Server-Sent Events client and included upstream fixes that were never released to npm. See [ZW edition differences](docs/wiki/ZW-Edition-Differences.md).

> httpyac CLI provides a command line interface to execute _.http and _.rest files. This can be used to quickly execute a single \*.http file, but also to execute all files in a folder. httpyac supports HTTP, Rest, GraphQL, WebSocket, gRPC, Server-Sent Events, MQTT, AMQP and Kafka Requests

<p align="center">
<a href="https://httpyac.github.io/">
<img src="https://httpyac.github.io/httpyac_site.png" alt="HttpYac" />
</a>
<img src="https://raw.githubusercontent.com/ZeroWiggliness/httpyac/main/assets/cli.gif" alt="HttpYac CLI" />
</p>

## Installation

```shell
npm install -g @zerowiggliness/httpyac
httpyac --version
```

or using docker

```shell
docker run -it -v ${PWD}:/data ghcr.io/zerowiggliness/httpyac:latest --version
```

## Commands

```shell
> httpyac --help

Usage: httpyac [options] [command]
httpYac - Quickly and easily send REST, SOAP, GraphQL and gRPC requests
Options:
  -V, --version                 output the version number
  -h, --help                    display help for command

Commands:
  oauth2 [options]              generate oauth2 token
  send [options] <fileName...>  send/ execute http files
  help [command]                display help for command
```

```shell
> httpyac help send

Usage: httpyac send [options] <fileName...>

send/ execute http files

Arguments:
  fileName                  path to file or glob pattern

Options:
  -a, --all                 execute all http requests in a http file
  --bail                    stops when a test case fails
  -e, --env  <env...>       list of environments
  --filter <filter>          filter requests output (only-failed)
  --insecure                allow insecure server connections when using ssl
  -i --interactive          do not exit the program after request, go back to selection
  --json                    use json output
  --junit                   use junit xml output
  -l, --line <line>         line of the http requests
  -n, --name <name>         name of the http requests
  --no-color                disable color support
  -o, --output <output>     output format of response (short, body, headers, response, exchange, none)
  --output-failed <output>  output format of failed response (short, body, headers, response, exchange, none)
  --raw                     prevent formatting of response body
  --quiet
  --repeat <count>          repeat count for requests
  --repeat-mode <mode>      repeat mode: sequential, parallel (default)
  --parallel <count>        send parallel requests
  -s, --silent              log only request
  -t, --tag  <tag...>       list of tags to execute
  --timeout <timeout>       maximum time allowed for connections
  --var  <variables...>     list of variables
  -v, --verbose             make the operation more talkative
  -h, --help                display help for command
```

CLI output uses terminal colors when supported. Use `--no-color` for plain-text output.

## Example

```http
@user = doe
@password = 12345678

GET https://httpbin.org/basic-auth/{{user}}/{{password}}
Authorization: Basic {{user}} {{password}}

```

See the [wiki documentation](docs/wiki/Home.md) for the full guide, including ZW edition features. The original guide and examples are at [httpyac.github.io](https://httpyac.github.io/guide/) ([examples](https://httpyac.github.io/guide/examples)).

### Kafka

```http
KAFKA localhost:9092
kafka_topic: orders
kafka_key: order-1
traceId: {{$uuid}}
content-type: application/json

{ "id": 1 }

###
KAFKA localhost:9092
kafka_topic: orders
kafka_group_id: order-check
kafka_from_beginning: true
kafka_max_messages: 1
kafka_timeout: 10000

?? header traceId exists
?? body id == 1
```

Headers without the `kafka_` prefix are sent as Kafka message headers, and consumed message headers are available as response headers. See the [Kafka guide](docs/kafka.md) for all methods and options.

### File matching assertions

Compare a response body or selected value with an expected file:

```http
GET https://httpbin.org/json

?? body matchesJsonFile ./expected/response.json
```

Use `matchesFile` for exact text comparison. See the [file-matching guide](docs/file-matching.md) for options and examples.

## End-to-end tests

The [end-to-end suite](end-to-end/README.md) runs assertion-bearing `.http` files against Docker Compose-hosted WireMock, including JWT token responses and OAuth2 client credentials.

## License

[MIT License](LICENSE)

## Change Log

[CHANGELOG](CHANGELOG.md)
