# Http Language
The document describes the HTTP Request in Editor format designed to provide a simple way to create, execute, and store information about HTTP requests. The specification mostly repeats [RFC 7230](https://tools.ietf.org/html/rfc7230#section-3https://tools.ietf.org/html/rfc7230#section-3) with several extensions intended for easier requests composing and editing.

The document is intended to serve as a complete and self-consistent specification. All readers are invited to report any errors, typos and inconsistencies.

## example

```
POST https://httpbin.org/post
Content-Type: application/json

{
  "url": "https://httpbin.org/pst"
}

```

## Comments

Line comments are supported in HTTP Requests. Comments can be used before or after a request, inside the header section, or within the request body. Comments used within the request body must start from the beginning of the line with or without indent.

```html
# comment type 1
// comment type 2

/*
  multi line comment
*/
```

## Request Separators

Multiple requests defined in a single file must be separated from each other with a request separator symbol. A separator may contain comments.

```html
### separator
```

Alternatively, the request can also be specified in [RFC 7230](https://tools.ietf.org/html/rfc7230#section-3.1.1) Request line format, which also triggers a separation.

```html
GET https://httpbin.org/post


GET https://httpbin.org/post
```

## Request

An HTTP request starts with a request line followed by optional header fields, message body, response handler, and previous response references. Message body must be separated from the request line or header fields with an empty line.

### Request-Line

A request line consists of a request method, target and the HTTP protocol version. If the request method is omitted, ‘GET’ will be used as a default. The HTTP protocol version can be also omitted.

```html
GET https://www.google.de HTTP/1.1

GET https://www.google.de

###

https://www.google.de
```

Allowed Requests Methods are: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS, CONNECT, TRACE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, CHECKOUT, CHECKIN, REPORT, MERGE, MKACTIVITY, MKWORKSPACE, VERSION-CONTROL, BASELINE-CONTROL

A resource path can be added in the next line

```html

GET https://httpbin.org
  /post

```
### Query Strings

A request query may contain any unicode characters except line separators and the ‘#’ symbol.

```html
GET https://www.google.de?q=httpyac
```
or can attached immediatly after the request-line


```html
GET https://www.google.de
  ?q=httpyac
  &ie=UTF-8
```
### Headers

Each header field consists of a case-insensitive field name followed by a colon (‘:’), optional leading whitespace, the field value, and optional trailing whitespace.

```html
GET https://www.google.de
Content-Type: text/html
Authorization: Bearer {{token}}
```

If you use the same headers several times, it is possible to store them in a variable and reuse them.

```html
{{
  exports.defaultHeaders = {
    'Content-Type': 'text/html',
    'Authorization': `Bearer ${token}`
  };
}}
GET https://www.google.de HTTP/1.1
...defaultHeaders
```

### Cookie

CookieJar support is enabled by default. All received Cookies, previously sent by the server with the Set-Cookie header are automatically sent back. It is possible to send own cookies to the server using cookie header.

```html
GET https://httpbin.org/cookies
Cookie: bar=foo
```

> Cookies are only stored In-Memory

### Request Body
The request body can be represented as a simple message or a mixed type message (multipart-form-data). A request message can be inserted in-place or from a file. Request Body is separated with a blank line from the request-line.

```html
POST {{host}}/auth
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {{authorization}}

grant_type=client_credentials
```

or
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
> If the request body is configured in-place, whitespaces around it will be trimmed. To send leading or trailing whitespaces as part of the request body, send it from a separate file.

#### multipart/form-data

It is possible to mix inline text with file imports

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

#### graphql
GraphQL queries are supported. Parsing Logic will automatically generate a GraphQL request body from the query and the optional variables. GraphQL fragments are also supported and are included in the body by name.

```html
fragment IOParts on Repository {
  description
  diskUsage
}

POST https://api.github.com/graphql
Content-Type: application/json
Authorization: Bearer {{git_api_key}}


query repositoryQuery($name: String!, $owner: String!) {
  repository(name: $name, owner: $owner) {
    name
    fullName: nameWithOwner
    ...IOParts
    forkCount
    watchers {
        totalCount
    }
  }
}

{
    "name": "vscode-httpyac",
    "owner": "AnWeber"
}
```

To import GraphQL File you need to use special GraphQL Import Directive. Operationname `foo` is optional

```html
POST https://api.github.com/graphql
Content-Type: application/json
Authorization: Bearer {{git_api_key}}


gql foo < ./bar.gql

{
    "name": "vscode-httpyac",
    "owner": "AnWeber"
}
```

## Variables

Variables are used for avoiding unnecessary data duplication in requests or for providing an easy way of switching between the development and production environments. They can be used inside request target, header fields and message body. Each variable is represented by a case-sensitive identifier surrounded by double curly braces.

```html
GET {{host}}/tasks
Authorization: Basic {{authorization}}

```


Variables can be easily created with the following scheme.
```
@host = http://elastic:9200
```

These are valid from definition for all subsequent requests and scripts. The variables are saved per file after creation. The variables are also imported from other files using @import meta data.

```
# @import ./variables.http

@host = {{keycloak_url}}
```


### Node JS Scripts
It is possible to create NodeJS scripts. All scripts before the request line are executed before the request is called. All scripts after the request line are executed as soon as the response is received. All exports of the script are stored as variables. External scripts can be imported using require, but you need to install dependencies yourself.

```
{{
  const CryptoJS = require('crypto-js');
  const request = httpRegion.request;
  const authDate = new Date();
  let requestUri = request.url.substring(request.url.indexOf('/v1'), request.url.indexOf('?') > 0 ? request.url.indexOf('?') : request.url.length);
  let timeInMillis = authDate.getTime() - authDate.getMilliseconds();

  let signature = request.method + "|" + requestUri + "|" + timeInMillis;

  let signatureHmac = CryptoJS.HmacSHA256(signature, accessSecret);
  let signatureBase64 = CryptoJS.enc.Base64.stringify(signatureHmac);
  exports.authentcation = serviceToken + " " + accessKey + ":" + signatureBase64;
}}
@host = https://www.mydomain.de
GET {{host}}/admin
Authentication: {{authentcation}}

{{
  const assert = require('assert');
  test("name is valid", () => {
    assert.equal(response.parsedBody.name, "Mario", );
  });
}}
```


> Variables already defined can be accessed via the global scope.

> Since all variables are placed on the global scope of the script, they may overwrite other variables. Please use unique variable names


In addition to the variables, the following values are also set

| name | description |
| - | - |
| request | request of the next [http request](https://github.com/AnWeber/httpyac/blob/main/src/models/httpRequest.ts) |
| response | [http response](https://github.com/AnWeber/httpyac/blob/main/src/models/httpResponse.ts) of the last request |
| httpRegion | current [httpRegion](https://github.com/AnWeber/httpyac/blob/main/src/models/httpRegion.ts) |
| httpFile | current [httpFile](https://github.com/AnWeber/httpyac/blob/main/src/models/httpFile.ts) |
| test | method to simplify [tests](https://github.com/AnWeber/httpyac/blob/main/src/actions/jsAction.ts#L40) ([assert](https://github.com/AnWeber/httpyac/blob/main/examples/script/assert.http) or [chai](https://github.com/AnWeber/httpyac/blob/main/examples/script/chai.http)) |

```html
@foo = https://httpbin.org

{{
  console.info(foo);
}}
```

test scripts are also possible
```html
GET https://httpbin.org/json

{{
  const { expect } = require('chai');
  test('status code 200', () => {
    expect(response.statusCode).to.equal(200)
  });
}}
```

```html
GET /json

{{
  const { expect } = require('chai');
  test('status code 200', () => {
    expect(response.statusCode).to.equal(200)
  });
}}

// output

HTTP/2.0 200 OK
content-type: application/json

{
  "slideshow": {
  ...
  }
}
[x] status code 200
```



Scripts with no request in the same region are always executed (Global Scripts). Global Scripts initialized with `{{+` are executed before every region. Global Scripts initialized with `{{+after` are executed after every region.

```

{{
  // executed once per http file
}}
{{+
  // executed before every requests in http file
  log.info(httpRegion.request.url)
}}
{{+after
  // executed after every requests in http file
  log.info(response)
}}
```


> External dependencies must be installed independently, exceptions are [vscode](https://www.npmjs.com/package/@types/vscode), [got](https://www.npmjs.com/package/got) and [httpYac](https://www.npmjs.com/package/httpyac) Dependency, which are provided from the extension.

> you can also require your own scripts/ *.js files and reuse code

### Variable Substitution in Request

Before the request is sent, all variables in the request (request line, headers, request body) are replaced with the value of the variable.

#### NodeJs Script Replacement
All entries of the form {{...}} are interpreted as NodeJS Javascript which returns exactly one value. Since all variables can be easily accessed on the global scope, this allows for simple substitution.

```
@searchVal = test

GET https://www.google.de?q={{searchVal}}
```

> It is possible to create more complex scripts, but this is not recommended and you should use a separate script block instead.

#### Rest Client Dynamic Variables
[Rest Client dynamic variables](https://github.com/Huachao/vscode-restclient#system-variables) are partially supported.

| Name | Description |
| - | - |
| $guid | generates a universally unique identifier (UUID-v4) |
| $randomInt min max | generates a random integer between `min` and `max`. |
| $timestamp [offset option] | generates the current UNIX timestamp |
| $datetime rfc1123\|iso8601\|"custom format"\|'custom format' [offset option] | generates a datetime string in either ISO8601, RFC1123 or a custom display format |
| $localDatetime rfc1123\|iso8601\|"custom format"\|'custom format' [offset option] | generates a local datetime string in either ISO8601, RFC1123 or a custom display format |

[example](https://github.com/AnWeber/httpyac/blob/main/examples/variables/restClient.http)

#### Intellij Dynamic Variables
[Intellij dynamic variables](https://www.jetbrains.com/help/idea/exploring-http-syntax.html#dynamic-variables) are supported.

| Name | Description |
| - | - |
| $uuid | generates a universally unique identifier (UUID-v4) |
| $timestamp | generates the current UNIX timestamp |
| $randomInt| generates a random integer between 0 and 1000. |

```html
GET https://www.google.de?q={{$timestamp}}&q2={{$uuid}}&q2={{$randomInt}}
```

##### Host Replacment
If the url starts with / and a variable host is defined the URL of this host will be prepended

```html
@host = http://elastic:9200


GET /.kibana

GET /_cat/indices
```


##### Input und QuickPick Replacement
Dynamic Variable Resolution with showInputBox and showQuickPick is supported

```html
@app = {{$pick select app? $value: foo,bar}}
@app2 = {{$input input app? $value: foo}}

```

##### OAuth2 / OpenID Connect Replacemen
The following [Open ID Connect](https://openid.net/specs/openid-connect-basic-1_0.html) flows are supported.

* Authentication (or Basic) Flow (grant_type = authorization_code)
* Implicit (or Hybrid) Flow (grant_type = implicit)
* Resource Owner Password Grant (grant_type = password)
* Client Credentials Grant (grant_type = client_credentials)

```html

GET /secured_service
Authorization: openid {{grant_type}} {{variable_prefix}}

```
To configure the flow, the following variables must be specified

| variable | flow | description |
| - | - | - |
| {{prefix}}_tokenEndpoint | authorization_code, implicit, password, client_credentials | Token Endpoint URI |
| {{prefix}}_clientId | authorization_code, implicit, password, client_credentials | OAuth 2.0 Client Identifier |
| {{prefix}}_clientSecret | authorization_code, implicit, password, client_credentials | OAuth 2.0 Client Secret |
| {{prefix}}_authorizationEndpoint | authorization_code, implicit | Authorization Endpoint URI |
| {{prefix}}_scope | authorization_code, implicit, password, client_credentials | Scope |
| {{prefix}}_responseType | authorization_code, implicit | response type of auth server |
| {{prefix}}_audience | authorization_code, implicit | audience |
| {{prefix}}_username | password | username for password flow |
| {{prefix}}_password | password | password for password flow |
| {{prefix}}_keepAlive | authorization_code, password, client_credentials | AccessToken is automatically renewed in the background before expiration with RequestToken |

##### example
```html

@keycloakHost = http://127.0.0.1:8080
@local_tokenEndpoint = {{keycloakHost}}/auth/realms/local/protocol/openid-connect/token
@local_clientId = httpyac
@local_clientSecret = 936DA01F-9ABD-4D9D-80C7-02AF85C822A8
@local_scope = openid profile

GET /secured_service
Authorization: openid client_credentials local
```

> To get the code from the Open ID server, a http server must be started for the Authorization Flow and Implicit Flow on port 3000 (default). The server is stopped immediatly after receiving the code. You need to configure your OpenId Provider to allow localhost:3000 as valid redirect url


It is possible to convert the generated token into a token of another realm using [Token Exchange](https://tools.ietf.org/html/rfc8693)


```html

GET /secured_service
Authorization: openid {{grant_type}} {{variable_prefix}} token_exchange {{token_exchange_prefix}}

# example

GET /secured_service
Authorization: openid client_credentials local token_exchange realm_auth
```

#### AWS Signnature v4 Replacment

AWS Signature v4 authenticates requests to AWS services.

```html
GET https://httpbin.org/aws
Authorization: AWS {{accessKeyId}} {{secretAccessKey}} token:{{token}} region:{{region}} service:{{serviceName}}
```

#### SSL Client Certificate Replacment

To use SSL Client Certifcates, the `clientCertificates` setting must be set. This contains the certificate to be used for each host. For each host either the certifcate/ key or pfx/ passphrase must be maintained.

* cert: Path of public x509 certificate
* key: Path of private key
* pfx: Path of PKCS #12 or PFX certificate
* passphrase: Optional passphrase for the certificate if required

```json
{
  "clientCertificates": {
    "example.com": {
      "cert": "./assets/client.crt",
      "key": "./assets/client.key"
    },
    "client.badssl.com": {
      "pfx": "./assets/badssl.com-client.p12",
      "passphrase": "badssl.com"
    }
  }
}
```

```html
GET https://client.badssl.com
```

> path should be absolute or relative to workspace root

It is also possible to attach the certificate using (X-)ClientCert header. The header will be removed.

```html
// Client-Cert: cert: <cert> key: <key> pfx: <pfx> passphrase: <passphrase>

GET https://client.badssl.com/
ClientCert: pfx: ../assets/badssl.com-client.p12 passphrase: badssl.com

// or

GET https://client.badssl.com/
X-ClientCert: pfx: ../assets/badssl.com-client.p12 passphrase: badssl.com
```

#### BasicAuth Replacment
A support method is provided for using Basic Authentication. Just specify the username and password separated by spaces and the base64 encoding will be applied automatically

```html
@host = https://httpbin.org
@user=doe
@password=12345678


GET /basic-auth/{{user}}/{{password}}
Authorization: Basic {{user}} {{password}}

```
#### DigestAuth Replacment
A support method is provided for using Digest Authentication. Just specify the username and password separated by spaces and the digest access authentication will be applied automatically

```html
@host = https://httpbin.org
@user=doe
@password=12345678


GET /digest-auth/auth/{{user}}/{{password}}
Authorization: Digest {{user}} {{password}}

```

#### Intellij Script

Intellij Scripts are supported. An [Http client]((https://www.jetbrains.com/help/idea/http-client-reference.html)) and [response](https://www.jetbrains.com/help/idea/http-response-reference.html) object corresponding to the interface is created and are available in the script. Possibly the behavior (order of test execution, not described internal Api, ...) is not completely identical, to Intellij Execution. If needed, please let me know.

```
GET https://www.google.de?q={{$uuid}}
Accept: text/html

> {%
    client.global.set("search", "test");
    client.test("Request executed successfully", function() {

        client.assert(response.status === 200, "Response status is not 200");
    });
%}
###

GET https://www.google.de?q={{$uuid}}
Accept: text/html

> ./intellij.js
```

> Intellij scripts are always executed after request. Scripts before Request Line are ignored


## Meta Data

All lines starting with `#` are interpreted as meta data lines. Lines in Format `# @foo bar` are interpreted as meta data (or alternatively `// @foo` because of [Intellij](https://www.jetbrains.com/help/idea/exploring-http-syntax.html#enable-disable-redirects)). It is possible to attach meta data that influences the processing of the request

### name
responses of a requests with a name are automatically added as variables and can be reused by other requests
```html
# @name keycloak
POST {{host}}/auth

###
GET {{host}}/tasks
Authorization: Bearer {{keycloak.access_token}}
```

> name must be unique in all imported files, there is no scope support and first found request with name will be used.

### ref and forceRef
requests can reference other requests. When the request is called, it is ensured that the referenced request is called beforehand. `forceRef` always call the other request. `ref` only calls if no response is cached.

```html
# @name keycloak
POST {{host}}/auth

###
GET {{host}}/tasks
# @ref keycloak
Authorization: Bearer {{keycloak.access_token}}
```

> It is possible to reference any number of requests.

### import
To reference requests from other files, these must first be imported. Imported files are enabled for all requests in one file.
```html
GET {{host}}/tasks
# @import ./keycloak.http
# @ref keycloak
Authorization: Bearer {{keycloak.access_token}}
```

### disabled
requests can be disabled. It is possible to disable requests dynamically with `{{httpRegion.metaParams.disabled=true}}` in script
```html
# @disabled
POST {{host}}/auth
```

### jwt
jwt meta data supports auto decode of jwt token. just provide property in response to decode and it is added to the promise with ${property}_parsed
```html
# @jwt access_secret

POST {{keycloak}}/auth/realms/test/protocol/openid-connect/token

```

### injectVariables
inject variables in request body (needed because of compatibility with Intellij)
```html
# @injectVariables

GET /anything

< ./variables.json

```

### note
shows a confirmation dialog before sending request

```html
# @note are you sure?
DELETE /invoices
```

### save

If `@save` is specified, the response will not be displayed but saved directly.
### openWith (VS Code only)

Provide viewType of custom editor to preview files. If content-type header of the response is image, files will be previewed automatically with built-in image preview. If content-type is `application/pdf` and extension [vscode-pdf](https://marketplace.visualstudio.com/items?itemName=tomoki1207.pdf) is installed, it will be used for preview.
```html
# @openWith imagePreview.previewEditor
https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/icon.png
```
### extension

extension of file for save or openWith.
### no-log

prevent logging of request data in output console
### no-cookie-jar

cookieJar support is disabled for this request

### no-client-cert

SSL client certificate is not send for this request

```html
# @no-client-cert

GET https://client.badssl.com/
X-ClientCert: pfx: ../assets/badssl.com-client.p12 passphrase: badssl.com
```

### no-reject-unauthorized

all invalid SSL certificates will be ignored and no error will be thrown.

```html
# @no-reject-unauthorized

GET https://client.badssl.com/
X-ClientCert: pfx: ../assets/badssl.com-client.p12 passphrase: badssl.com
```

## Environment Variables Support

Simultaneous use of multiple environments is supported.
All environment variables are expanded automatically.


```
# .env
auth_tokenEndpoint={{authHost}}/auth/realms/test/protocol/openid-connect/token

# 9.env
authHost=https://my.openid.de

# resolved variables
authHost=https://my.openid.de
auth_tokenEndpoint=https://my.openid.de/auth/realms/test/protocol/openid-connect/token
```

The VS Code extension supports switching to different environments. A different environment can be selected per file. Newly opened files are opened with the last active environment.

##### JSON Setting Support
Environments can be provided with setting `environmentVariables`. All settings with key `$shared` are shared between all environments

```json
{
  "$shared": {
    "host": "https://mydoman"
  },
  "dev": {
    "user": "mario",
    "password": "123456"
  },
  "prod": {
    "user": "mario",
    "password": "password$ecure123"
  }
}
```
> VS Code settings are automatically monitored and when changes are made, the environment is reinitialized.

##### Dotenv File Support
[dotenv](https://www.npmjs.com/package/dotenv) support is enabled by default.  This automatically scans the root folder of the project and a configurable folder for .env file. All files with the {{name}}.env or .env.{{name}} scheme are interpreted as different environment and can be picked while switching environments

> .env files are automatically monitored by File Watcher and when changes are made, the environment is reinitialized.

> it is possible to enable a dotenvVariableProvider, which scans the directory of the current *.http file. The default for this setting is disabled.

##### Intellij Environment Variables
[intellij environment variables support](https://www.jetbrains.com/help/idea/exploring-http-syntax.html#environment-variables) support is enabled by default. This automatically scans the root folder of the project and a configurable folder for http-client.env.json/ http-client.private.env.json file.

> http-client.env.json files are automatically monitored by File Watcher and when changes are made, the environment is reinitialized.

> it is possible to enable a intellijVariableProvider, which scans the directory of the current *.http file. The default for this setting is disabled.

## License
[MIT License](LICENSE)

