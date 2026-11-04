HttpYac files are plain text request collections. A file normally ends in `.http` or `.rest` and can be run by the ZW edition CLI, Docker image, or library. The same file can document an API, exercise it locally, and run assertions in CI.

Use this page as a map for the rest of the guide. For protocol details, see [Request](Guide-Request). For the ZW-only Kafka protocol, see [Kafka](Guide-Kafka).

## File shape

A request file is split into regions. Each region is a request plus optional metadata, variables, scripts, assertions, and response examples.

```http
@baseUrl = https://httpbin.org

### Sign in
# @name login
POST {{baseUrl}}/anything/login
Content-Type: application/json

{
  "user": "demo"
}

?? status == 200

### Use the previous response
GET {{baseUrl}}/anything/me
Authorization: Bearer {{login.response.body.$.token}}
```

The `###` line starts a new request region. Text after it is a human-readable separator title. Lines before the first request can define global variables or global regions that later requests can reuse.

## Request line

Most regions start with a request line:

```http
GET https://example.org/api/users HTTP/1.1
```

The request line defines the method, target, and optional HTTP version. If a plain URL is used without a method, HttpYac treats it as `GET`. Non-HTTP protocols use their own request line forms, for example `GRPC`, `WS`, `SSE`, `MQTT`, `AMQP`, or `KAFKA`. See [Request](Guide-Request).

## Headers

Headers follow the request line and use the normal `Name: value` format:

```http
GET https://example.org/api/users
Accept: application/json
Authorization: Bearer {{token}}
```

Headers can contain variables and can also configure protocol-specific behavior. For example, [MQTT](Guide-Request#mqtt) uses `topic`, [AMQP](Guide-Request#amqp-and-rabbitmq) uses `amqp_*` headers, and [Kafka](Guide-Kafka) uses `kafka_*` headers.

## Body

Put the body after the headers. A blank line before the body is recommended because it matches HTTP notation, although HttpYac can also detect many bodies without it.

```http
POST https://example.org/api/users
Content-Type: application/json

{
  "name": "Ada Lovelace"
}
```

Bodies can be JSON, text, form URL encoded data, multipart data, GraphQL variables, gRPC JSON messages, WebSocket frames, MQTT payloads, AMQP messages, and Kafka message values. File bodies can be imported with `< ./file` or `<@ ./file`; see [Request bodies](Guide-Request#request-bodies).

## Variables

Variables keep request files readable and reusable:

```http
@host = https://example.org
@id = 42

GET {{host}}/api/users/{{id}}
```

Variables can come from the file, environments, scripts, prompt/input helpers, response references, and built-in dynamic values. See [Variables](Guide-Variables) and [Environments](Guide-Environments).

## Scripts

Scripts let a region prepare data, react to responses, or export values:

```http
{{
  exports.userId = 42;
}}

GET https://example.org/api/users/{{userId}}
```

Use scripts when a request needs computed values or custom logic. See [Scripting](Guide-Scripting) and [Hooks](Guide-Hooks).

## Assertions

Assertions start with `??` and make request files useful as tests:

```http
GET https://example.org/api/users/42

?? status == 200
?? header content-type includes json
?? body name exists
```

Assertions can check status, headers, cookies, body values, JSONPath and more. The ZW edition also adds file comparison assertions. See [Assert](Guide-Assert).

## Related pages

- [Request](Guide-Request): protocol and request syntax
- [Kafka](Guide-Kafka): ZW-only Kafka protocol
- [Meta data](Guide-MetaData): `# @name`, `# @ref`, loops, proxies, TLS and more
- [Variables](Guide-Variables) and [Environments](Guide-Environments)
- [Scripting](Guide-Scripting), [Assert](Guide-Assert), and [Hooks](Guide-Hooks)
- [Comment](Guide-Comment), [Response](Guide-Response), [Injected languages](Guide-Injected-Languages), and [Badges](Guide-Badges)
- [Installation](Installation): CLI, VS Code and Docker
