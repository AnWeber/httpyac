import { log } from '../../../io';
import { createServer, Server } from 'http';

interface RequestListener {
  id: string;
  name: string;
  resolve: (params: Record<string, string>) => { valid: boolean; message: string; statusMessage: string };
  reject: () => void;
}

const listeners: Array<RequestListener> = [];

let server: Server | false;
let serverTimeout: NodeJS.Timeout | false;
let serverTimeoutTime = 0;

export function registerListener(listener: RequestListener): void {
  listeners.push(listener);
  initServer();
}

export function unregisterListener(id: string): void {
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
    serverTimeout = false;
    serverTimeoutTime = 0;
  }
}

function resetServer(seconds: number) {
  clearServerTimeout();
  const timeout = seconds * 1000;
  serverTimeoutTime = new Date().getTime() + timeout;
  serverTimeout = setTimeout(() => closeServer(), timeout);
}

function closeServer() {
  for (const listener of listeners) {
    listener.reject();
  }
  listeners.length = 0;
  if (server) {
    clearServerTimeout();
    server.close(err => {
      if (err) {
        log.error(err);
      } else {
        log.debug('http server closed');
      }
    });
    server = false;
  }
}

function initServer(port = 3000) {
  resetServer(600);
  if (!server) {
    log.debug(`open http server on port ${port}`);
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
              responseContent.push(`
                <script>
                  if(window.location.hash){
                    window.document.querySelector('.js-message').remove();
                    window.location.replace(\`\${window.location.href.substring(0,window.location.href.indexOf('#'))}?\${window.location.hash.substring(1)}\`);
                  }
                </script>
                <noscript>
                  ${getMessageHtml(
                    'Please enable javascript for redirect or replace fragment (#) with query (?)',
                    false
                  )}
                </noscript>
              `);
              statusMessage = 'invalid state received';
            }
          } else if (req.url.startsWith('/reject')) {
            const listener = listeners.find(obj => obj.id === queryParams.id);
            if (listener) {
              listener.reject();
              unregisterListener(queryParams.id);
              statusCode = 200;
              statusMessage = 'listener removed';
              responseContent.push(getMessageHtml(`${listener.name} removed`, true));
            } else {
              statusMessage = 'listener not found';
            }
          } else if (req.url.startsWith('/shutdown')) {
            closeServer();
            responseContent.push(getMessageHtml('server closed', true));
            statusCode = 200;
            statusMessage = 'server was shut down';
          }
        }
        responseContent.push(getServerStatus());
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(statusCode, statusMessage);
        res.end(getHtml(responseContent.join('')));
      } catch (err) {
        log.error(err);
        res.end(getHtml(`${err}`));
      }
    });
    server.listen(port);
  }
}

function parseQueryParams(url: string) {
  return url
    .slice(url.indexOf('?') + 1)
    .split('&')
    .reduce((prev, current) => {
      const [key, value] = current.split('=');
      prev[key] = value;
      return prev;
    }, {} as Record<string, string>);
}

function getMessageHtml(message: string, valid: boolean) {
  return `
<div class="card js-message ${valid ? 'card--success' : 'card--error'}">
  <h3 class="card__title">${valid ? 'success' : 'error'}</h3>
  <div class="card__message">${message}</div>
</div>`;
}

function getServerStatus() {
  const lines = [];
  if (listeners.length > 0) {
    lines.push(
      ...listeners.map(
        obj => `
      <div class="card">
        <h3 class="card__title">open requests</h3>
        <div class="card__message">${obj.name}</div>
        <div class="card__actions">
          <a href="/reject?id=${obj.id}">remove</a>
        </div>
      </div>`
      )
    );
  }
  if (serverTimeoutTime > 0) {
    lines.push(`
    <div class="card">
      <h3 class="card__title">Server Status</h3>
      <div class="card__message">automatic shutdown in ${toTimeString(
        Math.floor((serverTimeoutTime - new Date().getTime()) / 1000)
      )}</div>
      <div class="card__actions">
        <a href="/shutdown">shutdown</a>
      </div>
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
        return `${minutes}minute${minutes > 1 ? 's' : ''} ${sec} seconds`;
      }
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
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
      --light: #FAFAFA;
      --success: #4CAF50;
      --success-dark: #43A047;
      --error: #D32F2F;
      --error-dark: #C62828;
      --link-light: #E1F5FE;
      --link: #00B0FF;
      --link-dark: #0091EA;
    }
      body{
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        background-color: var(--light);
        display:flex;
        align-items: center;
        flex-direction: column;
      }

      .card{
        border-radius: 4px;
        background-color: #FFF;
        box-shadow: 0px 2px 1px -1px rgb(0 0 0 / 20%), 0px 1px 1px 0px rgb(0 0 0 / 14%), 0px 1px 3px 0px rgb(0 0 0 / 12%);
        width: 22rem;
        padding: .5rem;
        margin: auto;
        display: flex;
        flex-direction: column;
        justify-content: center;
        margin: 2rem;
      }

      .card--success{
        border-bottom: 1rem solid var(--success);
      }
      .card--success:hover{
        border-bottom: 1rem solid var(--success-dark);
      }

      .card--error{
        border-bottom: 1rem solid var(--error);
      }
      .card--error:hover{
        border-bottom: 1rem solid var(--error-dark);
      }
      .card__title{
        margin: 0 .5rem;
      }
      .card__message{
        padding: 0 .5rem;
        word-break: break-word;
      }
      .card__actions{
        padding: 1rem 0;
      }
      a {
          color: var(--link);
          text-decoration:none;
          border-radius:3px;
          cursor:pointer;
          text-transform: uppercase;
          padding: .5rem;
      }
      a:focus {
        outline-color: var(--link);
        color: var(--link);
      }
      a:hover, a:active {
          color: var(--link-dark);
          background-color: var(--link-light);
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
