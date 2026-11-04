Comments make `.http` files easier to read and, in several places, also provide metadata for tools such as symbols and request lists.

## Syntax

Use `#` or `//` for single-line comments and metadata-style comment lines. Use `/*` and `*/` on their own lines for a multi-line comment block.

```http
# explain the next request
// another comment line

/*
  multi-line comment text
  that can span several lines
*/

GET https://httpbin.org/json
```

Comment lines may have leading whitespace. A block comment must open with a line that contains only `/*` (apart from whitespace) and closes with a line that contains only `*/` (apart from whitespace).

## Comments and metadata

The parser treats `#` and `//` lines as comment or metadata lines. When the text starts with `@`, it becomes request metadata:

```http
# @name listUsers
# @description Loads the current user list.
GET https://api.example.com/users
```

Region separators also use `#`:

```http
### List users
GET https://api.example.com/users
```

The title after `###` becomes the request title and, when no explicit name exists, the request name. See [Meta data](Guide-MetaData) for the full metadata syntax.

## Request descriptions

A leading comment can be used as the request description in generated symbols and documentation. For predictable descriptions, prefer either:

- `# @description ...`
- a titled region such as `### List users`
- a leading `/* ... */` block before the request

```http
/*
Fetch a JSON slideshow document from httpbin.
*/
GET https://httpbin.org/json
```

## Comments inside request bodies

Comment syntax is recognized only when the marker starts the line, allowing whitespace before it. Text after body content is part of the body, not a comment.

```http
POST https://api.example.com/items
Content-Type: application/json

{
  "name": "literal // text",
  "note": "literal # text"
}
```

If a body line itself starts with `#`, `//` or a `/* ... */` block, HttpYac treats it as a comment or metadata line instead of body content.
