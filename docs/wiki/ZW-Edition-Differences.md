This page lists everything that **HttpYac (ZW edition)** (`@zerowiggliness/httpyac`) adds to or changes from upstream [httpyac](https://github.com/AnWeber/httpyac). The baseline is **upstream `httpyac` 6.16.7**, the latest upstream npm release. Other wiki pages mark these differences with a **ZW edition** note that links back here.

## Summary

| Area | Upstream httpyac 6.16.7 | ZW edition |
| --- | --- | --- |
| npm package | `httpyac` | `@zerowiggliness/httpyac` |
| Docker image | `ghcr.io/anweber/httpyac` | `ghcr.io/zerowiggliness/httpyac` (Node 24) |
| `QUERY` HTTP method | not supported | supported |
| Kafka | not supported | `KAFKA` / `kafka://` / `kafkas://` requests |
| File comparison asserts | not supported | `matchesFile`, `matchesJsonFile` |
| Server-Sent Events client | eventsource v2 | eventsource v5 with a custom fetch (proxy, TLS options, redirects) |
| CLI exit code for errored tests | `0` | `19` |
| AMQP | broken (`@cloudamqp/amqp-client` v2) | working again (`@cloudamqp/amqp-client` v3.4.1 upstream fix, now v4) |
| GraphQL `query { ... }` (anonymous, with a space) | `{` parsed as the operation name | parsed correctly |
| JUnit `<failure message>` | the test summary, not the error | the actual error message |

## New features

### `QUERY` HTTP method

`QUERY` is a safe, idempotent HTTP method (see the IETF *HTTP QUERY Method* draft). Unlike `GET`, the request body describes the query. The ZW edition recognizes `QUERY` on the request line, includes it in the list of HTTP methods for scripts and plugins, and offers it in editor completion.

```http
QUERY https://api.example.com/contacts
Content-Type: application/json
Accept: application/json

{
  "where": { "city": "Berlin" },
  "select": ["name", "email"]
}
```

See [Request](Guide-Request).

### Kafka

A new built-in protocol for [Apache Kafka](https://kafka.apache.org/). It can produce and consume messages and commit or seek consumer group offsets. Headers without the `kafka_` prefix become Kafka message headers, and consumed message headers are available as response headers. It supports SASL, SSL and any librdkafka setting through `kafka_config_<property>`.

```http
KAFKA localhost:9092
kafka_topic: orders
traceId: {{$uuid}}
content-type: application/json

{ "id": 1 }
```

Kafka uses the **optional** native dependency `@confluentinc/kafka-javascript`. If the dependency is not installed, only Kafka requests fail. See [Kafka](Guide-Kafka).

### File comparison asserts

Two new assert predicates compare a value with the contents of a file. The file path is relative to the `.http` file.

```http
GET https://api.example.com/report

?? body matchesFile ./expected/report.txt --trim --ignoreLineEndings
```

```http
GET https://api.example.com/items

?? body matchesJsonFile ./expected/items.json
```

- `matchesFile` compares the text exactly. `--trim` trims both sides, and `--ignoreLineEndings` treats CRLF, CR and LF as the same. On failure it reports the first line that differs.
- `matchesJsonFile` checks that the two JSON values are deeply equal and ignores key order. On failure it reports the first JSONPath that differs, for example `$.items[0].name`.

For plugin authors, `TestPredicate.match` can now be async, receives the `ProcessorContext`, and can return `{ valid, message }` to set a custom failure message. See [Assert](Guide-Assert) and [Plugin API](Plugin-API).

## Changed behavior

### Server-Sent Events

The SSE client is rebuilt on `eventsource` v5. That version no longer accepts headers, proxy or TLS options directly, so the ZW edition passes them through its own fetch implementation:

- request headers are sent (the `event` header still only selects which events to listen to)
- `# @proxy` and the `proxy` config are supported for `http://`, `https://` and `socks://` proxies
- `# @noRejectUnauthorized` and `--insecure` turn off certificate checks
- redirects (301, 302, 303, 307, 308) are followed, up to 5
- every message response reports status code `200`

See [Request](Guide-Request).

### CLI exit codes

| Exit code | Meaning |
| --- | --- |
| `0` | all requests ran and no test failed |
| `10` | unexpected error during execution |
| `19` | at least one test **errored** (an exception in a test or script) |
| `20` | at least one test **failed** (an assertion did not match) |

Upstream 6.16.7 returned `0` when a test errored, so CI pipelines could pass when they should have failed. See [Troubleshooting](Troubleshooting).

## Upstream fixes shipped in the ZW edition

These fixes are on upstream `main` but are not in any upstream npm release. The ZW edition ships them from 6.16.8:

- **Exit codes:** errored tests return a non-zero exit code, separate from failed tests (see above).
- **AMQP:** `@cloudamqp/amqp-client` updated to v3.4.1 so AMQP requests work again. The ZW edition has since moved to v4.
- **GraphQL parsing:** anonymous operations such as `query { ... }` (whitespace before `{`) no longer treat `{` as the operation name. The same fix applies to `mutation`, `fragment` and `gql <name> < file` lines.
- **JUnit output:** the `message` attribute of `<failure>` contains the actual error message (for example the failed assertion) instead of the test result summary.

## Packaging and maintenance

- Published to npm as `@zerowiggliness/httpyac` and to GitHub Container Registry as `ghcr.io/zerowiggliness/httpyac`.
- The Docker image and development use Node.js 24.
- Dependencies are kept up to date (for example TypeScript 6, eventsource v5, dotenv 18 and amqp-client v4).
- If an IntelliJ-style script fails to load, the error keeps the original exception as `cause`, which makes it easier to debug.

## VS Code extension

The [ZW edition VS Code extension](Installation-VSCode) is maintained in [ZeroWiggliness/vscode-httpyac](https://github.com/ZeroWiggliness/vscode-httpyac), with patches and updates based on Andreas Weber's original work. Fork-only features such as `QUERY`, Kafka and the file comparison asserts are available in the ZW edition CLI, Docker image and Node.js library.

## Reporting issues

Report problems with ZW edition features at [ZeroWiggliness/httpyac issues](https://github.com/ZeroWiggliness/httpyac/issues).
