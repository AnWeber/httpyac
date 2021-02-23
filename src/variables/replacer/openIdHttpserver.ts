
import { createServer, Server } from 'http';
import { log } from '../../logger';


interface RequestListener{
  id: string;
  name: string;
  resolve: (params: Record<string, string>) => { valid: boolean; message: string; statusMessage: string;};
  reject: () => void;
}

const listeners: Array<RequestListener> = [];

let server: Server | undefined;
let serverTimeout: NodeJS.Timeout | undefined;
let serverTimeoutTime: number = 0;

export function registerListener(listener: RequestListener){
  listeners.push(listener);
  initServer();
}

export function unregisterListener(id: string) {
  const listenerIndex = listeners.findIndex(obj => obj.id === id);
  if (listenerIndex >= 0) {
    listeners.splice(listenerIndex, 1);
  }
  if (listeners.length === 0) {
    resetServer(60);
  }
}


function clearServerTimeout() {
  if (serverTimeout) {
    clearTimeout(serverTimeout);
    serverTimeout = undefined;
    serverTimeoutTime = 0;
  }
}

function resetServer(seconds: number) {
  clearServerTimeout();
  const timeout = seconds * 1000;
  serverTimeoutTime = (new Date().getTime()) + timeout;
  serverTimeout = setTimeout(() => closeServer(), timeout);
}

function closeServer() {
  for (const listener of listeners) {
    listener.reject();
  }
  listeners.length = 0;
  if (server) {
    clearServerTimeout();
    server.close((err) => {
      if (err) {
        log.error(err);
      } else {
        log.info("http server closed");
      }
    });
    server = undefined;
  }
}

function initServer() {
  resetServer(600);
  if (!server) {
    server = createServer((req, res) => {
      try {
        let statusMessage = 'invalid';
        let statusCode = 500;

        const responseContent: string[] = [];

        if (req.url) {
          const queryParams = parseQueryParams(req.url);
          if (req.url.startsWith('/callback')) {
            const listener = listeners.find(obj => obj.id === queryParams.state);
            if (listener) {
              const result = listener.resolve(queryParams);
              responseContent.push(getMessageHtml(result.message, result.valid));
              if (result.valid) {
                statusCode = 200;
                unregisterListener(listener.id);
              }
              statusMessage = result.statusMessage;
            } else {
              responseContent.push(getMessageHtml('invalid state received', false));
              statusMessage = 'invalid state received';
            }
          } else if (req.url.startsWith('/reject')) {
            const listener = listeners.find(obj => obj.id === queryParams.id);
            if (listener) {
              listener.reject();
              unregisterListener(queryParams.id);
              statusCode = 200;
              statusMessage ="listener removed";
              responseContent.push(getMessageHtml(`${listener.name} removed`, true));
            } else {
              statusMessage = 'listener not found';
            }
          } else if (req.url.startsWith('/shutdown')) {
            closeServer();
            responseContent.push(getMessageHtml('server was shut down', true));
            statusCode = 200;
            statusMessage ="server was shut down";
          }
        }
        responseContent.push(getServerStatus());
        res.setHeader("Content-Type", "text/html");
        res.writeHead(statusCode, statusMessage);
        res.end(getHtml(responseContent.join('')));
      } catch (err) {
        log.error(err);
        res.end(getHtml(err));
      }
    });
    server.listen(3000);
  }
}



function parseQueryParams(url: string) {
  return url.substring(url.indexOf('?') + 1).split('&').reduce((prev, current) => {
    const [key, value] = current.split('=');
    prev[key] = value;
    return prev;
  }, {} as Record<string,string>);
}


function getMessageHtml(message: string, valid: boolean) {
  return `
<div class="box">
  <span class="message">${message}</span>
  ${valid ? `<svg class="icon" viewBox="0 0 24 24">
  <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
</svg>` : `<svg class="icon" viewBox="0 0 24 24">
<path fill="currentColor" d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z" />
</svg>`}
</div>`;

}

function getServerStatus() {
  const lines = [];
  if (listeners.length > 0) {
    lines.push('<h3>open requests</h3>');
    lines.push(...listeners.map(obj => `
      <div class="box">
        <span class="message">${obj.name}</span>
        <a href="/reject?id=${obj.id}">
          <svg class="iconlink" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
          </svg>
        </a>
      </div>`));
  }
  if (serverTimeoutTime > 0) {
    lines.push('<h3>server management</h3>');
    lines.push(`
    <div class="box">
      <span class="message">shutdown server (automatic shutdown in ${toTimeString(Math.floor((serverTimeoutTime - (new Date()).getTime()) / 1000))})</span>
      <a href="/shutdown">
        <svg class="iconlink" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
        </svg>
      </a>
    </div>`);
  }

  return lines.join('');
}

function toTimeString(seconds: number) {
  if (seconds > 0) {
    const minutes = Math.trunc(seconds / 60);
    const sec = seconds % 60;
    if (minutes > 0) {
      if (sec > 0) {
        return `${minutes}minute${minutes > 1 ? 's': ''} ${sec} seconds`;
      }
      return `${minutes} minute${minutes > 1 ? 's': ''}`;
    }
    return `${seconds} seconds`;
  }
  return '-';
}


function getHtml(message: string) {
  return `
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>httpYac</title>
    <link href='http://fonts.googleapis.com/css?family=Roboto' rel='stylesheet' type='text/css'>
    <style>
    :root{
      --grey: #9A9390;
      --brown: #BAA99D;
      --light: #F6EEE9;
    }
      body{
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        text-align:center;
        background-color: var(--light);
      }

      .box{
        background-color: var(--brown);
        width: 30rem;
        padding: 2rem;
        margin: auto;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
      }
      .message{
        flex-grow: 1;
      }
      .icon{
        color: var(--brown);
        background-color: var(--grey);
        border-radius:5px;
        width: 2.5em;
        height: 2.5em;
      }

      .iconlink{
        width: 2.5em;
        height: 2.5em;
      }
      a {
          color: var(--brown);
          background-color: var(--grey);
          text-decoration:none;
          border-radius:5px;
          cursor:pointer;
      }
      a:focus {
        outline-color: var(--light);
        color: var(--light);
      }
      a:hover, a:active {
          color: var(--light);
          background-color: var(--grey);
      }
    </style>
  </head>
  <body>
  <img src="https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/icon.png" alt="HttpYac Logo" />
${message}
</body>
</html>
`;
}