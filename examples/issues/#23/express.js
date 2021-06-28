const express = require('express')
const app = express()
const port = 5000

app.get('/api/v2/users', (req, res) => {
  const users = [{
    id: 1,
    name: 'john'
  }, {
    id: 2,
    name: 'doe'
  }];
  res.send(JSON.stringify(users));
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});