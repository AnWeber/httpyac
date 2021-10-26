# Contributing to httpyac


## Development Setup

This project uses [NodeJS LTS](https://nodejs.org/en/download/) and npm v7 for development. As development environment I recommend VS Code

``` sh
# install dependencies
npm i

# compile 
npm run compile

# watch
npm run watch
```

## Debug

1. Open project in VS Code
2. Open http file, which should be used for Debugging
3. Start Debug Launch Configuration `httpyac - launch` (`F5`). It uses active File as args for `httpyac`

### Alternative

1. Open root dir in shell
2. Execute `npm link` and `npm run watch`
3. Open project in VS Code and start [Javascript Debug Terminal](https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_javascript-debug-terminal)
4. Execute `httpyac` command. Debugger is attached automatically.
