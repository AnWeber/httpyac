client.test('Token retrieved successfully', function () {
  client.assert(response.status === 200, 'Response status is not 200');
  var access = response.body.access_token || response.body.args.test;
  if (access) {
    client.global.set('user_access_token', access);
  }
});