# httpYac - Yet Another Client

Parser and Processor for *.http Files
## Http Language
#### Request

Http language supports multiple Requests in one file. Requests get delimited with `###`. The first line in one region is interpreted as request-line. All Parts of a request supports replacement with dynamic variables (`{{variable}}`)

##### Request-Line

```html
GET https://www.google.de HTTP/1.1
```

Request Method and Http Version is optional. If no Request Method is provided GET is used.
##### Query Strings
Query Params can be added in the request-line

```html
GET https://www.google.de?q=httpyac HTTP/1.1
```
or can attached immediatly after the request-line


```html
GET https://www.google.de HTTP/1.1
  ?q=httpyac
  &ie=UTF-8
```
##### Headers

The next lines after the Request Line is parsed as request headers
```html
GET https://www.google.de HTTP/1.1
Content-Type: text/html
Authorization: Bearer {{token}}
```

##### Request Body
All content separated with a blank line after the request-line gets parsed as request body

```html
POST {{host}}/auth
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {{authorization}}

grant_type=client_credentials
```

You can also import contents of other files into the body (relative and absolute paths are supported).
```html
POST {{host}}/auth
Authorization: Basic {{authorization}}

< ./body.json
```

If you want to replace variables in the file please import it with `<@`
```html
POST {{host}}/auth
Authorization: Basic {{authorization}}

<@ ./body.json
```
All files are read with UTF-8 encoding. If a different encoding is desired, provide it.
```html
POST {{host}}/auth
Authorization: Basic {{authorization}}

<@latin1 ./body.json
```

Inline Text and file imports can be mixed

```html
POST {{host}}/auth
Content-Type: multipart/form-data; boundary=--WebKitFormBoundary

--WebKitFormBoundary
Content-Disposition: form-data; name="text"

invoice
--WebKitFormBoundary
Content-Disposition: form-data; name="invoice"; filename="invoice.pdf"
Content-Type: application/pdf

< ./invoice.pdf
--WebKitFormBoundary
```

#### Meta Data

All lines starting with `#` are interpreted as comment lines. Lines starting with `###` starts a new region. Lines with `# @property value` are meta data and tags the request with the property.

##### name
responses of a requests with a name are automatically added as variables and can be reused by other requests
```html
# @name keycloak
POST {{host}}/auth

###
GET {{host}}/tasks
Authorization: Bearer {{keycloak.access_token}}
```

> name must be unique in all imported files, there is no scope support and first found request with name will be used.

##### ref and forceRef
requests can reference other requests. When the request is called, it is ensured that the referenced request is called beforehand. `forceRef` always call the other request. `ref` only calls if no response is cached

```html
# @name keycloak
POST {{host}}/auth

###
GET {{host}}/tasks
# @ref keycloak
Authorization: Bearer {{keycloak.access_token}}
```

##### import
To reference requests from other files, these must first be imported. Imported files are enabled for all requests in one file.
```html
GET {{host}}/tasks
# @import ./keycloak.http
# @ref keycloak
Authorization: Bearer {{keycloak.access_token}}
```

##### disabled
requests can be disabled. It is possible to disable requests dynamically with `{{httpRegion.metaParams.disabled=true}}` in script
```html
# @disabled
POST {{host}}/auth
```

##### language
[Language Id](https://code.visualstudio.com/docs/languages/overview) of the response view. If language is not specified, it will be generated from the content-type header of the response

```html
# @language json
POST {{host}}/auth
```

##### save

If `@save` is specified, the response will not be displayed but saved directly.
##### openWith

Provide viewType of custom editor to preview files. If content-type header of the response is image, files will be previewed automatically with built-in image preview. If content-type is `application/pdf` and extension [vscode-pdf](https://marketplace.visualstudio.com/items?itemName=tomoki1207.pdf) is installed, it will be used for preview.
```html
# @openWith imagePreview.previewEditor
https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/icon.png
```
##### extension

extension of file for save or openWith.

#### Script

It is possible to create NodeJS scripts. All scripts before the request line are executed before the request is called. All scripts after the request line are executed as soon as the response is received. All exports of the script are stored as variables. External scripts can be imported using require.
All scripts in the request will be replaced with the value of the variable. But here no line break is supported

```
{{
  exports.host="https://www.mydomain.de";
  exports.authentcation="Bearer " + token;
}}
# @name admin
GET {{host}}/admin
Authentication: {{authentcation}}

{{
  const assert = require('assert');
  assert.equal(admin.name, "Mario", "name is valid");
}}
```

> Since all variables are placed on the global scope of the script, they may overwrite other variables. Please use unique variable names

Scripts with no request in the same region are executed for every requests in the file

```
{{
  exports.host="https://www.mydomain.de";
  exports.authentcation="Bearer " + token;
}}
###
# @name admin
GET {{host}}/admin
Authentication: {{authentcation}}

###
# @users
GET {{host}}/users
Authentication: {{authentcation}}

```
