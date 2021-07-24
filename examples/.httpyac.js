module.exports = {
	"log": {
		"responseBodyLength": 0,
		"prettyPrint": true
	},
	"clientCertificates": {
		"client.badssl.com": {
			"pfx": "./assets/badssl.com-client.p12",
			"passphrase": "badssl.com"
		}
	},
	configureHooks: function (hooks) {

		/*
		hooks.beforeRequest.addHook('funky', function (request) {
			request.headers['foo'] = 'bar';
		});
		hooks.afterRequest.addHook('funky', function (response) {
			response.body = 'foo';
			delete response.parsedBody;
			delete response.prettyPrintBody;
		});
		*/
	}
}