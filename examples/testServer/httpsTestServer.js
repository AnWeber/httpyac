const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');


const app = express();
app.get('*', (req, res) => {
  res.redirect(`https://localhost:5433${req.url}`);
});

app.listen(5000, () => {
  console.log(`HTTP  listening at http://localhost:5000`)
});

const httpsApp = express()
httpsApp.get('/api/v2/users', (req, res) => {
  const users = [{
    id: 1,
    name: 'john'
  }, {
    id: 2,
    name: 'doe'
  }];
  res.setHeader('content-type', 'application/json')
  res.send(JSON.stringify(users));
});
httpsApp.get('*', (req, res) => {
  res.statusCode = 404;
  res.send('not found');
});
https.createServer({
	key: fs.readFileSync(path.join(__dirname, './server.key')),
	cert: fs.readFileSync(path.join(__dirname, './server.cert'))
}, httpsApp)
  .listen(5433, () => {
  console.log(`HTTPS listening at https://localhost:5433`)
});