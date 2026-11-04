HttpYac can find HTTP request blocks inside documentation files. This lets you keep runnable requests next to the prose that explains them.

## Markdown

In Markdown files, fenced code blocks marked as `http` or `rest` are parsed as HttpYac request regions.

````markdown
# API example

```http
GET https://httpbin.org/json
```
````

The Markdown injector is enabled for files ending in:

- `.md`
- `.markdown`
- `.mdown`
- `.mkdn`
- `.mdtxt`
- `.mdtext`
- `.text`
- `.rmd`

Inside the fenced block, write the same syntax that you would write in a `.http` or `.rest` file:

````markdown
```http
### Get JSON
GET https://httpbin.org/json

?? status == 200
```
````

## Asciidoctor

In Asciidoctor files, use a source block with the `http` language.

```apl
== API example

[source,http]
----
GET https://httpbin.org/json
----
```

The Asciidoctor injector is enabled for files ending in:

- `.adoc`
- `.asciidoc`
- `.asc`

## Parsing behavior

Only matching code blocks are parsed. Text outside the block remains documentation. Internally, HttpYac treats the beginning of each injected block like a request separator, so request titles, metadata, scripts, assertions and variables work the same way they do in ordinary `.http` files.

```http
### Get JSON
GET https://httpbin.org/json

?? status == 200
```

Use normal `###` separators inside a block when you need more than one request region.

```http
### First request
GET https://httpbin.org/get

### Second request
POST https://httpbin.org/post
Content-Type: application/json

{ "ok": true }
```

Injected languages are especially useful for README files and API design notes.
