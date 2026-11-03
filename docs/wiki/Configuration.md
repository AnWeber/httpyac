HttpYac reads configuration from project files, package metadata, CLI or editor options, environment files, and variables inside `.http` files. This page describes every configuration option in the ZW edition.

## Quick example

```js
// httpyac.config.js
module.exports = {
  log: {
    level: 5,
    supportAnsiColors: true,
    options: {
      responseBodyPrettyPrint: true,
      timings: true,
    },
  },
  request: {
    timeout: 10000,
    https: {
      rejectUnauthorized: false,
    },
  },
  proxy: "http://localhost:8080",
  proxyExcludeList: ["http://localhost", "https://internal.example"],
  defaultHeaders: {
    "x-client": "httpyac",
  },
  cookieJarEnabled: true,
  envDirName: "env",
  environments: {
    "$shared": {
      baseUrl: "https://api.example.com",
    },
    dev: {
      token: "dev-token",
    },
  },
};
```

Equivalent JSON can be placed in the `httpyac` key of `package.json`, but functions such as `configureHooks` and `oauth2_interceptRequest` require JavaScript configuration or variables.

## Project root and config files

For each `.http` file, httpyac first resolves an absolute file name and then searches upward for a project root.

1. It looks for the nearest directory containing one of the recognized config files.
2. If no config file is found, it looks for the nearest directory containing `package.json` or the configured environment directory name.
3. If neither search succeeds, the current working directory is used as the root.

Recognized config files are checked in this order, and the first one present in the root wins:

1. `.httpyac.js`
2. `.httpyac.cjs`
3. `.httpyac.config.js`
4. `.httpyac.config.cjs`
5. `httpyac.config.js`
6. `httpyac.config.cjs`
7. `.httpyac.json`
8. `httpyac.config.json`

JavaScript and CommonJS config files can export either an object or a function that returns an object:

```js
module.exports = () => ({
  cookieJarEnabled: true,
  request: {
    timeout: 5000,
  },
});
```

Package metadata is used only when no config file was loaded. HttpYac reads `package.json` files from the request file directory up to the project root and merges their `httpyac` objects so that nearer package files override parent package files.

```json
{
  "httpyac": {
    "envDirName": "httpyac-env",
    "cookieJarEnabled": false
  }
}
```

## Precedence

Configuration is deep-merged in this order:

1. Built-in defaults.
2. The first matching config file, or the collected `package.json` `httpyac` values.
3. Runtime configuration from the CLI, editor, or library caller.

Runtime options therefore override project files. Request-specific values then override global defaults when the request is executed:

- metadata such as `# @timeout`, `# @proxy`, `# @noRedirect`, and `# @noRejectUnauthorized`
- environment variables such as `request_timeout`, `request_proxy`, `request_noRedirect`, and `request_rejectUnauthorized`
- options set by scripts, plugins, and client certificate handling

Client certificate file paths from `clientCertificates` are resolved relative to the project root when possible. A custom `envDirName` in a config file is not used to find the project root, because the root has already been chosen before that config is loaded.

## EnvironmentConfig reference

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `cookieJarEnabled` | `boolean \| object` | `true` | Enables a shared in-memory cookie jar for HTTP requests unless a request has `# @noCookieJar`. An object is passed to `tough-cookie` as cookie jar options. |
| `log` | `object` | see nested keys | Logging configuration. |
| `log.level` | `LogLevel` number | `warn` (`5`) | Minimum log level. Values are `trace` `1`, `debug` `2`, `warn` `5`, `info` `10`, `error` `100`, and `none` `1000`. |
| `log.supportAnsiColors` | `boolean` | `true` | Enables ANSI color output. `false` disables Chalk color support. |
| `log.options` | `RequestLoggerFactoryOptions` | `undefined` | Default CLI response logger options; see [Logging](Configuration#logging). |
| `request` | `ConfigRequest` plus protocol client options | `undefined` | Default request-client options. HTTP requests merge this object into Got options; other protocol clients read selected fields. |
| `proxy` | `string` | `undefined` | Default proxy URL. Supports HTTP(S) proxies and `socks://` where the protocol client supports it. |
| `proxyExcludeList` | `string[]` | `undefined` | URL prefixes that disable the global `proxy` value when `request.url.startsWith(prefix)`. |
| `requestPrettyPrintBodyMaxSize` | `number` | `undefined` | Declared config key for limiting response body pretty printing. The source comment names `1000000` characters as the intended threshold, but the current source does not read this key. |
| `requestBodyInjectVariablesExtensions` | `string[]` | `undefined` | File extensions for imported request bodies that should be read as text and have variables injected automatically. |
| `clientCertificates` | `Record<string, ClientCertificateOptions>` | `undefined` | Client certificates keyed by `host[:port]`; applied automatically when the request URL host matches. |
| `defaultHeaders` | `Record<string, string>` | `undefined` | Headers added to every request unless that request already has the same header name. |
| `environments` | `Record<string, Variables>` | `undefined` | Inline environment variables; see [Environments](Configuration#environments). |
| `envDirName` | `string` | `"env"` | Relative or absolute directory name used by dotenv and IntelliJ environment providers. |
| `useRegionScopedVariables` | `boolean` | `undefined` (`false`) | Changes variable sharing between request regions; see [Region-scoped variables](Configuration#region-scoped-variables). |
| `configureHooks` | `(api) => void \| Promise<void>` | `undefined` | Inline hook registration using the same API as plugins. |
| `plugins` | `Record<string, unknown>` | `undefined` | Free-form plugin configuration available to plugins through `api.config.plugins`. Built-in plugins do not validate it. |

## Request defaults

`request` is merged into protocol-specific client options. For HTTP requests, httpyac also applies these internal Got defaults before merging project configuration:

```js
{
  decompress: true,
  retry: 0,
  throwHttpErrors: false,
  allowGetBody: true,
}
```

Common request defaults:

| Key | Type | Applies to | Notes |
| --- | --- | --- | --- |
| `request.timeout` | `number` | HTTP, gRPC, WebSocket, MQTT; Kafka in ZW edition | Milliseconds. Request metadata or `request_timeout` variables override it. For HTTP it is converted to Got's `timeout.request` (the entire request); for gRPC it becomes a deadline; for WebSocket it sets handshake/session timeout; for MQTT it sets connect timeout. |
| `request.https.rejectUnauthorized` | `boolean` | HTTP/Got | Use `false` to allow invalid TLS certificates for HTTP requests. CLI `--insecure` sets this value. |
| `request.rejectUnauthorized` | `boolean` | WebSocket, MQTT, OAuth2 token requests | Use `false` to allow invalid TLS certificates for these clients. `# @noRejectUnauthorized` and `request_rejectUnauthorized=false` also disable verification for a request. |
| `request.followRedirect` | `boolean` | HTTP/Got | Got uses the singular option name. Set `false` for a global HTTP no-redirect policy. |
| `request.followRedirects` | `boolean` | WebSocket | The WebSocket client reads the plural option. `# @noRedirect` and `request_noRedirect=true` override it for a request. |
| any other Got option | `unknown` | HTTP/Got | The HTTP client passes additional keys through to Got. No file loading or variable replacement is performed inside this object. |

Numeric HTTP timeouts from CLI `--timeout`, `# @timeout`, and `request_timeout` use the same conversion. A value of `0` disables the total request timeout. Phase-specific Got timeout options are preserved when the total timeout is overridden.

> [!NOTE]
> **ZW edition:** [Kafka](Guide-Kafka) uses the global `request.timeout` value as its connection timeout, and `defaultHeaders` are sent as Kafka message headers. See [ZW edition differences](ZW-Edition-Differences).

## Proxy

`proxy` sets a global proxy URL. Per-request `# @proxy <url>` metadata and `request_proxy` variables set `request.proxy` and take precedence. `proxyExcludeList` removes the proxy for URL prefixes after the request URL is known. `# @noProxy` disables the proxy for a single request.

```js
module.exports = {
  proxy: "socks://127.0.0.1:1080",
  proxyExcludeList: ["http://localhost", "https://metadata.google.internal"],
};
```

The HTTP client creates `HttpProxyAgent`, `HttpsProxyAgent`, or `SocksProxyAgent` instances. The same proxy value is also used by WebSocket and other clients that implement proxy support.

> [!NOTE]
> **ZW edition:** The `proxy` setting now also applies to SSE requests through the reworked EventSource fetch implementation. See [ZW edition differences](ZW-Edition-Differences).

## HTTPS and client certificates

For HTTP requests, Got TLS options belong under `request.https`:

```js
module.exports = {
  request: {
    https: {
      rejectUnauthorized: false,
    },
  },
};
```

For clients that read the simpler flag, use `request.rejectUnauthorized: false`. Request-level `# @noRejectUnauthorized` works by setting `request.noRejectUnauthorized` and wins over the global value.

`clientCertificates` maps URL hosts to certificate material:

```js
module.exports = {
  clientCertificates: {
    "api.example.com": {
      cert: "./certs/client.crt",
      key: "./certs/client.key",
      passphrase: "secret",
    },
    "localhost:8443": {
      pfx: "./certs/client.pfx",
      passphrase: "secret",
    },
  },
};
```

Supported `ClientCertificateOptions` fields are:

| Key | Type | Description |
| --- | --- | --- |
| `cert` | `PathLike` | Client certificate file. |
| `key` | `PathLike` | Private key file. |
| `pfx` | `PathLike` | PFX/PKCS#12 file. |
| `passphrase` | `string` | Passphrase for encrypted keys or PFX files. |

Config-file certificate paths are resolved relative to the project root. Certificates can also be assigned through variables whose type name ends in `clientCert`, using text such as `cert: ./client.crt key: ./client.key passphrase: secret`.

## Cookie jar

`cookieJarEnabled` defaults to `true`. When enabled, HTTP requests get an in-memory `tough-cookie` jar unless the region has `# @noCookieJar`.

```js
module.exports = {
  cookieJarEnabled: {
    looseMode: true,
    rejectPublicSuffixes: false,
    allowSpecialUseDomain: true,
    prefixSecurity: "silent",
  },
};
```

Set `cookieJarEnabled: false` to disable automatic cookie handling.

## Default headers

`defaultHeaders` are added before request variables are replaced. Existing request headers are preserved, so a request can override a default by declaring the same header.

```js
module.exports = {
  defaultHeaders: {
    authorization: "Bearer {{token}}",
    "user-agent": "httpyac-zw",
  },
};
```

Headers are converted to strings before HTTP requests are sent.

## Logging

`log.level` controls diagnostic output. Use the numeric enum values:

```ts
trace = 1
debug = 2
warn = 5
info = 10
error = 100
none = 1000
```

`log.supportAnsiColors: false` disables colored output.

`log.options` customizes the CLI response logger. It has the same shape as `RequestLoggerFactoryOptions`:

| Key | Type | Description |
| --- | --- | --- |
| `useShort` | `boolean` | Print one-line response summaries. |
| `requestOutput` | `boolean` | Include request information. |
| `requestHeaders` | `boolean` | Include request headers when request output is enabled. |
| `requestBodyLength` | `number` | Include request body text; `0` means no truncation. |
| `responseHeaders` | `boolean` | Include response headers. |
| `responseBodyPrettyPrint` | `boolean` | Pretty-print response bodies when a formatter is available. |
| `responseBodyLength` | `number` | Include response body text; `0` means no truncation. |
| `timings` | `boolean` | Include timing details. |
| `onlyFailed` | `boolean` | Log only failed responses/tests. |

CLI output options such as `--output`, `--output-failed`, `--raw`, and `--filter only-failed` are converted to these logger options at runtime and override project configuration.

## Environments

`environments` provides variables directly in config. Environment names are the top-level keys, except for two special names:

- `$shared` is always applied first.
- `$default` is used when no environment is selected.

Selected environments are applied in the order requested, so later environments override earlier ones.

```js
module.exports = {
  environments: {
    "$shared": {
      baseUrl: "https://api.example.com",
    },
    "$default": {
      token: "local-token",
    },
    dev: {
      baseUrl: "https://dev.example.com",
    },
    prod: {
      baseUrl: "https://api.example.com",
    },
  },
};
```

Use `httpyac send -e dev requests.http` to select `dev`. See [Environments](Guide-Environments) and [Variables](Guide-Variables).

## Dotenv files

The dotenv plugin reads environment variables from:

1. The directory named by the `HTTPYAC_ENV` process environment variable, if set.
2. The request file directory and each parent directory up to the project root.
3. The `envDirName` directory under each of those directories.

For no selected environment, `.env` is loaded. For selected environments, httpyac also searches `<env>.env` and `.env.<env>`.

For a selected `dev` environment, this means:

```text
.env
dev.env
.env.dev
```

More specific files override earlier ones, and files nearer the request override parent folders. In a single folder, files in `envDirName` override files directly beside the request. Project dotenv values override `HTTPYAC_ENV` values.

Environment names are discovered from files named `.env.<name>` or `<name>.env` in the same search locations.

## Region-scoped variables

By default, variables created in one request region can be shared with later regions in the file. `useRegionScopedVariables: true` changes execution so each request starts from global variables plus global region variables; new variables are copied back only if they do not already exist in the outer context.

This is useful when repeated or parallel request execution should avoid accidental cross-region mutation.

## OAuth2 variables

OAuth2 is configured through variables, so the same values can come from `environments`, dotenv files, CLI `--var`, or normal `.http` variables. The default prefix is `oauth2`, and an `Authorization: oauth2` value starts the `client_credentials` flow unless another flow is named.

```http
@oauth2_tokenEndpoint = https://login.example.com/oauth/token
@oauth2_clientId = demo
@oauth2_clientSecret = secret
@oauth2_scope = api.read

GET {{baseUrl}}/private
Authorization: oauth2
```

Supported variable names use `<prefix>_<name>` or nested object syntax such as `oauth2.tokenEndpoint`. If a custom prefix is used, missing values fall back to the `oauth2` prefix.

| Name | Type | Description |
| --- | --- | --- |
| `authorizationEndpoint` | `string` | Authorization endpoint for browser-style flows. |
| `deviceCodeEndpoint` | `string` | Device code endpoint. |
| `tokenEndpoint` | `string` | Token endpoint. |
| `clientId` | `string` | OAuth client ID. |
| `clientSecret` | `string` | OAuth client secret. |
| `responseType` | `string` | Response type for authorization flows. |
| `responseMode` | `string` | Response mode for authorization flows. |
| `audience` | `string \| string[]` | Audience value. |
| `scope` | `string` | Space-separated scopes. |
| `resource` | `string \| string[]` | Resource value. |
| `username` | `string` | Username for password flow. |
| `password` | `string` | Password for password flow. |
| `proxy` | `string` | Proxy used for OAuth token requests. |
| `subjectIssuer` | `string` | Subject issuer for token exchange. |
| `redirectUri` | `URL` | Defaults to `http://localhost:3000/callback`. |
| `keepAlive` | `boolean` | Defaults to `true`; refreshes cached tokens before expiry when possible. |
| `useAuthorizationHeader` | `boolean` | Defaults to `true`; sends client credentials in a Basic authorization header. |
| `useDeviceCodeClientSecret` | `boolean` | Includes the client secret in device code flow requests. |
| `usePkce` | `boolean` | Enables PKCE for supported authorization flows. |
| `serverPort` | `number` | Local callback server port. |
| `interceptRequest` | `function` | Hook to modify OAuth token requests before sending. |

OAuth2 token requests also honor `request.rejectUnauthorized` from the active config and host-matched `clientCertificates`.

## Request body variable injection

Imported request bodies are binary by default unless the import explicitly requests variable injection. `requestBodyInjectVariablesExtensions` forces text loading and variable replacement for listed extensions.

```js
module.exports = {
  requestBodyInjectVariablesExtensions: ["json", "graphql", "txt"],
};
```

Use this sparingly: files are loaded into memory as text and variables are expanded even when the request body import did not ask for it.

## Hooks and plugins

`configureHooks` lets a project config register hooks without publishing a plugin:

```js
module.exports = {
  configureHooks(api) {
    api.hooks.responseLogging.addHook("redactAuth", response => {
      if (response?.request?.headers) {
        delete response.request.headers.authorization;
      }
    });
  },
};
```

The hook receives the same API exposed to plugins, including `config`, `httpFile`, `hooks`, `log`, `fileProvider`, `sessionStore`, `httpClientProvider`, `javascriptProvider`, `userInteractionProvider`, and utility helpers. See [Plugin API](Plugin-API).

HttpYac also auto-loads plugin packages from the nearest `package.json` dependencies and devDependencies when their package names match:

```text
httpyac-plugin-*
httpyac-*-plugin-*
@scope/httpyac-plugin-*
@scope/httpyac-*-plugin-*
```

The `HTTPYAC_PLUGIN` process environment variable can point to a global plugin module that exports `configureHooks`.

`plugins` is reserved for plugin-specific configuration. For example:

```js
module.exports = {
  plugins: {
    "httpyac-plugin-example": {
      enabled: true,
    },
  },
};
```

Plugin authors should read their settings from `api.config.plugins`.
