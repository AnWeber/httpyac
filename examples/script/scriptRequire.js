const crypto = require('crypto');

exports.authenticate = function authenticate(authDate, request) {
  const url = request.url;
  const method = request.method;

  const requestUri = url.substring(url.indexOf('/anything'), url.indexOf('?') > 0 ? url.indexOf('?') : url.length);
  const timeInMillis = authDate.getTime() - authDate.getMilliseconds();

  const signature = `${method}\u2028${requestUri}\u2028${timeInMillis}`;
  const signatureBase64 = crypto.createHmac('sha256', 'secret').update(signature).digest("base64");
  return `Basic ${signatureBase64}`;
}