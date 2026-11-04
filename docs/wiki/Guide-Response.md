Responses can be written directly in a `.http` file. They are mainly documentation: they let editors show an expected or example response before a request has been executed.

## Inline response blocks

An HTTP response block starts with a status line:

```http
GET https://httpbin.org/json

HTTP/1.1 200 - OK
Content-Type: application/json

{
  "slideshow": {
    "title": "Sample Slide Show"
  }
}
```

The HTTP status line format is:

```http
HTTP/<version> <status-code> - <status message>
```

- `<version>` is stored as the response HTTP version.
- `<status-code>` must be an HTTP status code from `100` to `599`.
- The hyphen before the status message is optional.
- Header lines after the status line are parsed as response headers.
- Body lines after the headers are stored as the inline response body.

Inline response bodies are not sent to the server. When the region is displayed, HttpYac can use this response as the initial documented response for the request.

## Protocol response formats

Other protocol plugins can add their own inline response status lines. For example, AMQP and SSE use protocol names instead of `HTTP/1.1`:

```http
AMQP 0 - message published
```

```http
SSE 0 - connected
```

> [!NOTE]
> **ZW edition:** [Kafka](Guide-Kafka) responses use the `KAFKA` protocol with status `0` for ok and `1` for error. Inline Kafka responses use `KAFKA 0 - <status message>`, and SSE message responses always report status `200`. See [ZW edition differences](ZW-Edition-Differences).

## Real response handling

After a real request runs, HttpYac stores the latest response in `response` for scripts, assertions and later variable replacement. If the request has `# @name`, HttpYac also exposes:

- `<name>` as the parsed response body when possible, otherwise the raw body text
- `<name>Response` as the full response object

```http
# @name getSlideshow
GET https://httpbin.org/json

###
GET https://example.com/next/{{getSlideshow.slideshow.title}}
```

JSON responses with a JSON content type are parsed into `response.parsedBody` and pretty-printed for output when possible. See [Variables](Guide-Variables), [Scripting](Guide-Scripting) and [Assert](Guide-Assert) for examples that use response data.

## Output redirection

Use output redirection to write the raw response body to a file.

```http
GET https://httpbin.org/image/png
>> image.png
```

`>>` writes to the named file. If a file with the same name already exists, HttpYac chooses a suffixed name such as `image-1.png` for normal file names with an extension.

Use `>>!` to overwrite the target file:

```http
GET https://httpbin.org/image/png
>>! image.png
```

The file name can contain variables and is resolved relative to the current `.http` file when it is not absolute.

```http
@id = 42

GET https://api.example.com/files/{{id}}
>> ./downloads/file-{{id}}.bin
```

## Response references

Response references can be recorded with `<>` or `# @responseRef`. They are parsed as response-related file references for tooling that wants to associate a request with saved response data.

```http
GET https://api.example.com/users
<> ./responses/users.http
```

```http
# @responseRef ./responses/users.http
GET https://api.example.com/users
```
