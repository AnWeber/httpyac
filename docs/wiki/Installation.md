HttpYac (ZW edition) can be used as a global command line tool, from editor extensions, or from a container. Pick the installation path that matches how you want to run `.http` and `.rest` files.

## Options

- [CLI](Installation-CLI): install `@zerowiggliness/httpyac` with npm and run requests from a terminal or CI job.
- [VS Code](Installation-VSCode): use the ZW edition extension for editor actions and inline responses.
- [Docker](Installation-Docker): run the packaged ZW edition CLI from `ghcr.io/zerowiggliness/httpyac`.

## Choosing an install

Use the [CLI](Installation-CLI) for the most direct ZW edition experience. It is the best fit for CI, test automation, scripted runs, and fork-only features such as `QUERY`, Kafka requests and file comparison asserts.

Use [Docker](Installation-Docker) when you do not want to install Node.js or global npm packages on the host.

Use [VS Code](Installation-VSCode) when editor integration is more important than using the forked runtime.

> [!NOTE]
> **ZW edition:** the VS Code extension is maintained separately from the CLI. Check the [extension repository](https://github.com/ZeroWiggliness/vscode-httpyac) for extension-specific feature support. See [ZW edition differences](ZW-Edition-Differences).
