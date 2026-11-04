**HttpYac (ZW edition)** is a command line tool and Node.js library for running requests written in `.http` and `.rest` files. It supports HTTP/REST, GraphQL, gRPC, WebSocket, Server-Sent Events, MQTT, AMQP and Kafka. You can send a single request, run a whole folder of files in CI, and add scripts and assertions for tests.

This edition is a fork of [httpyac](https://github.com/AnWeber/httpyac) by [Andreas Weber](https://github.com/AnWeber). It adds features and ships fixes that are not in an upstream release yet. Most of this wiki is adapted from the upstream docs at [httpyac.github.io](https://httpyac.github.io/) (MIT licensed). Sections that differ from upstream are marked with a **ZW edition** note.

> [!NOTE]
> **ZW edition:** adds the `QUERY` method, the Kafka protocol, file comparison asserts (`matchesFile`, `matchesJsonFile`), a reworked Server-Sent Events client, and upstream fixes that were never released to npm. See [ZW edition differences](ZW-Edition-Differences).

## Quick start

```shell
npm install -g @zerowiggliness/httpyac
httpyac --version
```

Create `example.http`:

```http
@user = doe
@password = 12345678

GET https://httpbin.org/basic-auth/{{user}}/{{password}}
Authorization: Basic {{user}} {{password}}

?? status == 200
```

and run it:

```shell
httpyac send example.http
```

## Contents

### Getting started
- [Installation](Installation): [CLI](Installation-CLI), [VS Code](Installation-VSCode), [Docker](Installation-Docker)
- [Guide](Guide): an overview of the `.http` file format

### Language
- [Request](Guide-Request): HTTP, GraphQL, gRPC, WebSocket, SSE, MQTT, AMQP
- [Kafka](Guide-Kafka): produce, consume, commit and seek *(ZW edition)*
- [Meta data](Guide-MetaData): `# @name`, `# @ref`, `# @loop` and more
- [Variables](Guide-Variables) and [Environments](Guide-Environments)
- [Scripting](Guide-Scripting), [Assert](Guide-Assert) and [Hooks](Guide-Hooks)
- [Comment](Guide-Comment), [Response](Guide-Response), [Injected languages](Guide-Injected-Languages), [Badges](Guide-Badges)

### Reference
- [Configuration](Configuration)
- [Plugins](Plugins) and the [Plugin API](Plugin-API)
- [Examples](Examples)
- [Troubleshooting](Troubleshooting)
- [ZW edition differences](ZW-Edition-Differences)

## Links

- Source: [ZeroWiggliness/httpyac](https://github.com/ZeroWiggliness/httpyac)
- npm package: [@zerowiggliness/httpyac](https://www.npmjs.com/package/@zerowiggliness/httpyac)
- Docker image: `ghcr.io/zerowiggliness/httpyac`
- Upstream project: [AnWeber/httpyac](https://github.com/AnWeber/httpyac) and its docs at [httpyac.github.io](https://httpyac.github.io/)
