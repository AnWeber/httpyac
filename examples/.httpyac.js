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
	configureHooks: function (api) {


		api.hooks.beforeRequest.addHook('funky', function (request) {
			request.headers['foo'] = 'bar';
		});

	}
}