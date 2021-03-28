<p align="center">
<img src="https://raw.githubusercontent.com/AnWeber/httpyac/master/icon.png" alt="HttpYac Logo" />
</p>

# Http Yac - Yet another Rest Client

Command Line Interface for *.http and *.rest files

![example](https://raw.githubusercontent.com/AnWeber/httpyac/master/assets/cli.gif)

> This program is used to execute *.http files on the command line. These can be created most easily with [vscode-httpyac](https://marketplace.visualstudio.com/items?itemName=anweber.vscode-httpyac).


## Examples

```html
@user = doe
@password = 12345678

GET https://httpbin.org/basic-auth/{{user}}/{{password}}
Authorization: Basic {{user}} {{password}}

```

```html

fragment IOParts on Repository {
  description
  diskUsage
}

POST https://api.github.com/graphql
Content-Type: application/json
Authorization: Bearer {{git_api_key}}


query test($name: String!, $owner: String!) {
  repository(name: $name, owner: $owner) {
    name
    fullName: nameWithOwner
    ...IOParts
    forkCount
    stargazers(first: 5) {
        totalCount
        nodes {
            login
            name
        }
    }
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

> [more examples](https://github.com/AnWeber/httpyac/tree/main/examples)

A complete specification / documentation can be found [here](https://github.com/AnWeber/httpyac/tree/main/examples/README.md)


### Commands

```shell
> httpyac --help

       --all          execute all regions in a http file
       --timeout      maximum time allowed for connections
  -e   --env          list of environemnts
  -h   --help         help
       --insecure     allow insecure server connections when using ssl
  -l   --line         line of the region
  -n   --name         name of the region
  -r   --repeat       repeat count for requests
       --repeat-mode  repeat mode: sequential, parallel (default)
       --root         absolute path to root dir of project
  -v   --verbose      make the operation more talkative

```


## Settings

To load the environment variables, the root folder of the project is automatically searched. The root folder is determined where a `package.json`, `.httpyac.json` or a folder `env` is searched.

The program can be configured either in the `.httpyac.json` file or in `the package.json` in the `httpyac key`. This [interfaces](https://github.com/AnWeber/httpyac/blob/main/src/models/environmentConfig.ts) describes all supported settings.


## License
[MIT License](LICENSE)

## Change Log
See CHANGELOG [here](CHANGELOG.md)
