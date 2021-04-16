
# How to debug scripts

* Install httpyac with `npm install httpyac -g`
* open Http File in VSCode
* add [debugger;](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Statements/debugger) statement in script
```html
GET /json

{{
  console.info(response);
  debugger;
  console.info(response);
}}

```
* open [Javascript Debug Terminal](https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_javascript-debug-terminal) in VS Code
* execute command `httpyac <file> -l <line>`