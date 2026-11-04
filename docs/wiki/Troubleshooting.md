Use this page when a request behaves differently in the CLI, VS Code, or CI. Start by running the same request with the fork CLI package from [Installation CLI](Installation-CLI), because editor integrations may bundle a different httpyac core.

## First checks

- Confirm the command uses `@zerowiggliness/httpyac`, not the upstream `httpyac` npm package.
- Re-run with `--verbose` when you need request, transport, or plugin details.
- For CI, keep `--junit` output as an artifact so failed and errored tests can be inspected after the job exits.
- Report fork-only feature issues at https://github.com/ZeroWiggliness/httpyac/issues.

## Self-signed certificate rejected

Node.js rejects self-signed certificates by default. For a single request, disable certificate validation with metadata:

```http
# @noRejectUnauthorized
GET https://localhost:8443/health
```

For a whole workspace, configure request options in `.httpyac.js`:

```js
module.exports = {
  request: {
    https: {
      rejectUnauthorized: false,
    },
  },
};
```

In VS Code, the same option can be set through `httpyac.requestGotOptions`:

```json
{
  "httpyac.requestGotOptions": {
    "https": {
      "rejectUnauthorized": false
    }
  }
}
```

Only disable certificate validation for local development or controlled test systems.

## Protocol "https:" not supported. Expected "http:" in VS Code with HTTP/2

This usually comes from VS Code proxy handling. HTTP/2 requests use the Node HTTP/2 wrapper, and VS Code's proxy agent can pass an incompatible agent when proxy support is forced.

Turn off VS Code proxy override for the workspace and retry:

```ini
https.proxysupport=off
```

If your environment requires a corporate proxy, verify the same request with the CLI outside VS Code. That separates proxy-agent issues from request syntax or server issues.

## CLI exit codes

The `send` command sets process exit codes after request execution and assertion handling.

| Exit code | Meaning |
| --- | --- |
| `0` | Command completed without unexpected errors, errored tests, or failed tests. |
| `10` | An unexpected runtime error occurred. |
| `19` | At least one test result ended in `ERROR`. |
| `20` | At least one test result ended in `FAILED`, and no test result ended in `ERROR`. |

> [!NOTE]
> **ZW edition:** CLI exit codes distinguish errored tests from failed tests; upstream npm `6.16.7` returned `0` for errored tests. See [ZW edition differences](ZW-Edition-Differences).

For GitHub Actions, any non-zero exit code fails the step. Combine this with `--junit` to keep machine-readable results:

```shell
httpyac send "test/**/*.http" --all --junit > httpyac-junit.xml
```

## Kafka support requires the optional dependency @confluentinc/kafka-javascript

Kafka support is loaded from the optional native package `@confluentinc/kafka-javascript`. If it is missing or cannot be loaded, Kafka requests fail with an error like:

```text
Kafka support requires the optional dependency @confluentinc/kafka-javascript, which could not be loaded (...)
```

Fixes:

- Prefer the fork Docker image when you want a known-good runtime:

  ```shell
  docker run --rm -v "%cd%":/data -w /data ghcr.io/zerowiggliness/httpyac:latest send kafka.http --all
  ```

- Use a Node.js version supported by the dependency's prebuilt binaries. The fork Docker image uses Node 24.
- Reinstall the fork package so optional dependencies are attempted again:

  ```shell
  npm install -g @zerowiggliness/httpyac
  ```

- For a local project install, add the optional dependency explicitly if your package manager skipped it:

  ```shell
  npm install --save-dev @zerowiggliness/httpyac @confluentinc/kafka-javascript
  ```

- If no prebuilt binary is available for your platform, install the native build toolchain required by `@confluentinc/kafka-javascript`, then reinstall.

> [!NOTE]
> **ZW edition:** Kafka protocol support is a fork feature and depends on `@confluentinc/kafka-javascript`. See [ZW edition differences](ZW-Edition-Differences).

## The upstream VS Code extension does not recognize QUERY, Kafka, matchesFile, or matchesJsonFile

The upstream VS Code extension may not parse or execute ZW-only features such as:

- `QUERY` requests
- `KAFKA` requests
- `matchesFile` and `matchesJsonFile` assertions

Use the fork CLI or library package for these features:

```shell
npm install -g @zerowiggliness/httpyac
httpyac send requests.http --all
```

> [!NOTE]
> **ZW edition:** Fork-only syntax works in the ZW CLI and library package unless an editor extension is rebuilt against the fork. See [ZW edition differences](ZW-Edition-Differences).

Report fork feature issues at https://github.com/ZeroWiggliness/httpyac/issues. For issues that reproduce with the upstream extension using only upstream syntax, include that detail when filing the report.
