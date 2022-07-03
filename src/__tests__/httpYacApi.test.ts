import { send } from '../httpYacApi';
import * as io from '../io';
import { HttpFileStore } from '../store';
import { promises as fs } from 'fs';
import { getLocal } from 'mockttp';
import { EOL } from 'os';
import { isAbsolute, dirname, extname, join } from 'path';

function initFileProvider(files?: Record<string, string> | undefined) {
  const fileProvider = io.fileProvider;
  fileProvider.EOL = EOL;

  fileProvider.isAbsolute = async fileName => isAbsolute(fileProvider.toString(fileName));
  fileProvider.dirname = fileName => dirname(fileProvider.toString(fileName));
  fileProvider.hasExtension = (fileName, ...extensions) =>
    extensions.indexOf(extname(fileProvider.toString(fileName))) >= 0;
  fileProvider.joinPath = (fileName, path) => join(fileProvider.toString(fileName), path);
  fileProvider.exists = async fileName => Promise.resolve(typeof fileName === 'string' && !!files && !!files[fileName]);
  fileProvider.readFile = filename => {
    if (typeof filename === 'string' && files && files[filename]) {
      return Promise.resolve(files[filename]);
    }
    throw new Error('No File');
  };
  fileProvider.readBuffer = filename => {
    if (typeof filename === 'string' && files && files[filename]) {
      return Promise.resolve(Buffer.from(files[filename]));
    }
    throw new Error('No File');
  };
  fileProvider.readdir = async dirname => fs.readdir(fileProvider.toString(dirname));
}

describe('send', () => {
  const localServer = getLocal();
  beforeEach(() => localServer.start(8080));
  afterEach(() => localServer.stop());

  async function build(code) {
    return await new HttpFileStore().getOrCreate(`any.http`, async () => Promise.resolve(code), 0, {
      workingDir: __dirname,
    });
  }

  async function exec(code) {
    const httpFile = await build(code);

    return send({
      httpFile,
    });
  }

  describe('http', () => {
    it('get http', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/get').thenReply(200);

      await exec(`GET http://localhost:8080/get`);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].headers['user-agent']).toBe('httpyac');
    });

    it('get http with multiline', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/bar').thenReply(200);

      await exec(`
GET http://localhost:8080
  /bar
  ?test=foo
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].path).toBe('/bar?test=foo');
    });

    it('get http with headers', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/get').thenReply(200);

      await exec(`
GET http://localhost:8080/get
Authorization: Bearer test
Date: 2015-06-01
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].headers.authorization).toBe('Bearer test');
      expect(requests[0].headers.date).toBe('2015-06-01');
    });

    it('post http', async () => {
      initFileProvider();
      const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
      const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

      await exec(`
POST http://localhost:8080/post
Content-Type: application/json

${body}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].headers['content-type']).toBe('application/json');
      expect(await requests[0].body.getText()).toBe(body);
    });

    it('post json variable', async () => {
      initFileProvider();
      const body = JSON.stringify({ foo: 'foo', bar: 'bar' });
      const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

      await exec(`
{{
  exports.body = ${body}
}}
POST http://localhost:8080/post
Content-Type: application/json

{{body}}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].headers['content-type']).toBe('application/json');
      expect(await requests[0].body.getText()).toBe(body);
    });

    it('imported body', async () => {
      const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
      initFileProvider({ 'body.json': body });
      const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

      await exec(`
POST http://localhost:8080/post
Content-Type: application/json

<@ ./body.json
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].headers['content-type']).toBe('application/json');
      expect(await requests[0].body.getText()).toBe(body);
    });

    it('imported buffer body', async () => {
      const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
      initFileProvider({ 'body.json': body });
      const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

      await exec(`
POST http://localhost:8080/post
Content-Type: application/json

< ./body.json
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].headers['content-type']).toBe('application/json');
      expect(await requests[0].body.getText()).toBe(body);
    });

    it('x-www-form-urlencoded', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

      await exec(`
@clientId=test
@clientSecret=xxxx-xxxxxxx-xxxxxx-xxxx

          POST http://localhost:8080/post
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={{clientId}}&client_secret={{clientSecret}}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].headers['content-type']).toBe('application/x-www-form-urlencoded');
      expect(await requests[0].body.getText()).toBe(
        `grant_type=client_credentials&client_id=test&client_secret=xxxx-xxxxxxx-xxxxxx-xxxx`
      );
    });
  });

  describe('graphql', () => {
    it('query + operation + variables', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);

      await exec(`
POST  http://localhost:8080/graphql

query launchesQuery($limit: Int!){
  launchesPast(limit: $limit) {
    mission_name
    launch_date_local
    launch_site {
      site_name_long
    }
    rocket {
      rocket_name
      rocket_type
    }
    ships {
      name
      home_port
      image
    }
  }
}

{
    "limit": 10
}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/graphql');
      expect(await requests[0].body.getText()).toBe(
        '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
      );
    });

    it('query with fragment', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);

      await exec(`
fragment RocketParts on LaunchRocket {
  rocket_name
  first_stage {
    cores {
      flight
      core {
        reuse_count
        status
      }
    }
  }
}

POST http://localhost:8080/graphql HTTP/1.1
Content-Type: application/json


query launchesQuery($limit: Int!){
  launchesPast(limit: $limit) {
    mission_name
    launch_date_local
    launch_site {
      site_name_long
    }
    rocket {
      ...RocketParts
    }
  }
}

{
    "limit": 10
}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/graphql');
      expect(await requests[0].body.getText()).toBe(
        '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      ...RocketParts\\n    }\\n  }\\n}\\nfragment RocketParts on LaunchRocket {\\n  rocket_name\\n  first_stage {\\n    cores {\\n      flight\\n      core {\\n        reuse_count\\n        status\\n      }\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
      );
    });

    it('only query', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);

      await exec(`
POST http://localhost:8080/graphql
Content-Type: application/json

query company_query {
  company {
    coo
  }
}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/graphql');
      expect(await requests[0].body.getText()).toBe(
        '{"query":"query company_query {\\n  company {\\n    coo\\n  }\\n}","operationName":"company_query"}'
      );
    });

    it('imported query', async () => {
      initFileProvider({
        'graphql.gql': `
query launchesQuery($limit: Int!){
  launchesPast(limit: $limit) {
    mission_name
    launch_date_local
    launch_site {
      site_name_long
    }
    rocket {
      rocket_name
      rocket_type
    }
    ships {
      name
      home_port
      image
    }
  }
}
        `,
      });
      const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);

      await exec(`
POST http://localhost:8080/graphql
Content-Type: application/json

gql launchesQuery < ./graphql.gql

{
    "limit": 10
}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/graphql');
      expect(await requests[0].body.getText()).toBe(
        '{"query":"\\nquery launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}\\n        ","operationName":"launchesQuery","variables":{"limit":10}}'
      );
    });
  });

  describe('metadata', () => {
    it('name + ref', async () => {
      initFileProvider();
      const refEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });
      const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
      const httpFile = await build(`
# @name foo
GET  http://localhost:8080/json

###
# @ref foo
POST http://localhost:8080/post?test={{foo.test}}

foo={{foo.foo}}

###
# @ref foo
POST http://localhost:8080/post?test={{foo.test}}

foo={{foo.foo}}
      `);

      await send({
        httpFile,
        httpRegion: httpFile.httpRegions[1],
      });

      const refRequests = await refEndpoints.getSeenRequests();
      expect(refRequests[0].url).toBe('http://localhost:8080/json');
      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/post?test=1');
      expect(await requests[0].body.getText()).toBe('foo=bar');
    });

    it('name + ref + falsy body', async () => {
      initFileProvider();
      const refEndpoints = await localServer.forGet('/json').thenReply(200);
      const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
      const httpFile = await build(`
# @name child
GET  http://localhost:8080/json

###
# @ref child
# @name parent
POST http://localhost:8080/post?test={{child}}

foo={{child}}

###
# @ref child
# @ref parent
POST http://localhost:8080/post?test={{parent}}

foo={{parent}}
      `);

      await send({
        httpFile,
        httpRegion: httpFile.httpRegions[2],
      });

      const refRequests = await refEndpoints.getSeenRequests();
      expect(refRequests[0].url).toBe('http://localhost:8080/json');
      expect(refRequests.length).toBe(1);
      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/post?test=');
      expect(await requests[0].body.getText()).toBe('foo=');
      expect(await requests[1].body.getText()).toBe('foo=');
    });

    it('name + import + ref', async () => {
      initFileProvider({
        'import.http': `
# @name foo
GET  http://localhost:8080/json
        `,
      });
      await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });
      const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
      const httpFile = await build(`
# @import ./import.http
###
# @ref foo
POST http://localhost:8080/post?test={{foo.test}}

foo={{foo.foo}}
      `);

      await send({
        httpFile,
        httpRegion: httpFile.httpRegions[1],
      });

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/post?test=1');
      expect(await requests[0].body.getText()).toBe('foo=bar');
    });

    it('name + forceRef', async () => {
      initFileProvider();
      const refEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });
      const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
      const httpFile = await build(`
# @name foo
GET  http://localhost:8080/json

###
# @forceRef foo
POST http://localhost:8080/post?test={{foo.test}}

foo={{foo.foo}}

###
# @forceRef foo
POST http://localhost:8080/post?test={{foo.test}}

foo={{foo.foo}}
      `);
      const [, ...httpRegions] = httpFile.httpRegions;

      await send({
        httpFile,
        httpRegions,
      });

      const refRequests = await refEndpoints.getSeenRequests();
      expect(refRequests.length).toBe(2);
      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/post?test=1');
      expect(await requests[0].body.getText()).toBe('foo=bar');
    });

    it('disabled', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

      await exec(`
# @disabled
GET http://localhost:8080/json
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(0);
    });

    it('disabled with script', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

      await exec(`
# @disabled !this.token
{{
  exports.token = 'test'
}}
GET http://localhost:8080/json
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(0);
    });
    it('disabled with expression', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

      await exec(`
{{
  httpRegion.metaData.disabled = true;
}}
GET http://localhost:8080/json
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(0);
    });
    it('jwt', async () => {
      initFileProvider();
      await localServer.forGet('/json').thenJson(200, {
        foo: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        test: 1,
      });
      const httpFile = await build(`
# @jwt foo
GET  http://localhost:8080/json
      `);
      httpFile.hooks.onResponse.addHook('test', response => {
        expect(response?.parsedBody).toBeDefined();
        expect((response?.parsedBody as Record<string, unknown>)?.foo_parsed).toBeDefined();
      });

      const result = await send({
        httpFile,
      });
      expect(result).toBeTruthy();
    });

    it('loop for of', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/json').thenReply(200);

      await exec(`
{{
  exports.data = ['a', 'b', 'c'];
}}
###
# @loop for item of data
GET  http://localhost:8080/json?index={{$index}}&test={{item}}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/json?index=0&test=a');
      expect(requests[1].url).toBe('http://localhost:8080/json?index=1&test=b');
      expect(requests[2].url).toBe('http://localhost:8080/json?index=2&test=c');
    });

    it('loop for', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/json').thenReply(200);

      await exec(`
# @loop for 3
GET  http://localhost:8080/json?test={{$index}}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/json?test=0');
      expect(requests[1].url).toBe('http://localhost:8080/json?test=1');
      expect(requests[2].url).toBe('http://localhost:8080/json?test=2');
    });

    it('loop while', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/json').thenReply(200);

      await exec(`
{{
  exports.expression = {
    index: 0,
  };
}}
###
# @loop while expression.index < 3
GET  http://localhost:8080/json?test={{expression.index++}}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/json?test=0');
      expect(requests[1].url).toBe('http://localhost:8080/json?test=1');
      expect(requests[2].url).toBe('http://localhost:8080/json?test=2');
    });
    it('loop for + ref', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/test').thenCallback(req => ({
        status: 200,
        body: `foo${req.url.slice(-1)}`,
      }));

      const httpFile = await build(`
# @name foo
# @loop for 2
GET http://localhost:8080/test?index={{$index}}

###
# @ref foo
# @loop for item of fooList
GET http://localhost:8080/test?index={{$index}}&item={{item.body}}
      `);

      await send({
        httpFile,
        httpRegion: httpFile.httpRegions[1],
      });

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/test?index=0');
      expect(requests[1].url).toBe('http://localhost:8080/test?index=1');
      expect(requests[2].url).toBe('http://localhost:8080/test?index=0&item=foo0');
      expect(requests[3].url).toBe('http://localhost:8080/test?index=1&item=foo1');
    });
  });

  describe('variables', () => {
    it('file variables', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

      await exec(`
@foo=foo
@bar={{foo}}bar
GET http://localhost:8080/json?bar={{bar}}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/json?bar=foobar');
    });

    it('host', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

      await exec(`
@host=http://localhost:8080
GET /json
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/json');
    });

    it('escape handlebar', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forPost('/post').thenJson(200, { foo: 'bar', test: 1 });
      const escape = `\\{\\{title\\}\\}`;

      await exec(`
POST  http://localhost:8080/post

<html>
<div>${escape}</div>
</html>
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(await requests[0].body.getText()).toBe('<html>\n<div>{{title}}</div>\n</html>');
    });

    it('basic auth', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/json').thenJson(200, { foo: 'bar', test: 1 });

      await exec(`
GET  http://localhost:8080/json
Authorization: Basic john:doe

###
GET  http://localhost:8080/json
Authorization: Basic john doe
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].headers.authorization).toBe('Basic am9objpkb2U=');
      expect(requests[1].headers.authorization).toBe('Basic am9objpkb2U=');
    });

    it('digest auth', async () => {
      initFileProvider();
      const missingAuthEndpoints = await localServer
        .forGet('/json')
        .matching(request => !request.headers.authorization)
        .thenReply(401, null, {
          'www-authenticate':
            'Digest realm="json@localhost",qop="auth,auth-int",nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093",opaque="5ccc069c403ebaf9f0171e9517f40e41"',
        });
      const mockedEndpoints = await localServer
        .forGet('/json')
        .matching(request => !!request.headers.authorization)
        .thenReply(200);

      await exec(`
GET  http://localhost:8080/json
Authorization: Digest john doe

###
GET  http://localhost:8080/json
Authorization: Digest john:doe
      `);

      const authMissingRequests = await missingAuthEndpoints.getSeenRequests();
      expect(authMissingRequests.length).toBe(2);
      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(2);
      for (const request of requests) {
        expect(request.headers.authorization).toBe(
          'Digest username="john", realm="json@localhost", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", uri="/json", response="4d157d692f3e05a1cbe192ddbc427782", opaque="5ccc069c403ebaf9f0171e9517f40e41"'
        );
      }
    });

    it('set string variable', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });

      await exec(`
# @name fooString
GET  http://localhost:8080/test

@slideshow={{fooString.slideshow.author}}
###
#@ref fooString
GET  http://localhost:8080/test?author={{slideshow}}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/test');
      expect(requests[1].url).toBe('http://localhost:8080/test?author=httpyac');
    });

    it('set object variable', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });

      await exec(`
# @name fooObject
GET  http://localhost:8080/test

@slideshow={{fooObject.slideshow}}
###
GET  http://localhost:8080/test?author={{slideshow.author}}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/test');
      expect(requests[1].url).toBe('http://localhost:8080/test?author=httpyac');
    });

    it('set object variable with number', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/get').thenJson(200, { foo: { test: 1 } });

      await exec(`
# @name objectNumber
GET http://localhost:8080/get

@foo={{objectNumber.foo}}
###
GET http://localhost:8080/get?test={{foo.test}}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/get');
      expect(requests[1].url).toBe('http://localhost:8080/get?test=1');
    });

    it('direct replace variable', async () => {
      initFileProvider();
      await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });
      const mockedEndpoints = await localServer.forGet('/text').thenJson(200, { slideshow: { author: 'foo' } });

      await exec(`
GET  http://localhost:8080/test

@slideshow={{response.parsedBody.slideshow}}
###
GET  http://localhost:8080/text?author={{slideshow.author}}
###
GET  http://localhost:8080/text?another_author={{slideshow.author}}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/text?author=httpyac');
      expect(requests[1].url).toBe('http://localhost:8080/text?another_author=httpyac');
    });

    it('lazy replace variable', async () => {
      initFileProvider();
      await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });
      const mockedEndpoints = await localServer.forGet('/text').thenJson(200, { slideshow: { author: 'foo' } });

      await exec(`
  GET http://localhost:8080/test

  @slideshow:={{response.parsedBody.slideshow}}
  ###
  GET http://localhost:8080/text?author={{slideshow.author}}
  ###
  GET http://localhost:8080/text?another_author={{slideshow.author}}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/text?author=httpyac');
      expect(requests[1].url).toBe('http://localhost:8080/text?another_author=foo');
    });

    it('string empty variable', async () => {
      initFileProvider();
      await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });
      const mockedEndpoints = await localServer.forGet('/text').thenJson(200, { slideshow: { author: 'foo' } });

      await exec(`
{{
  exports.foo = "";
}}
  GET http://localhost:8080/text?foo={{foo}}

      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/text?foo=');
    });
    it.only('nested replace variable', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/test').thenJson(200, { slideshow: { author: 'httpyac' } });

      await exec(`
@baz=works
{{
  exports.test = { bar: '{{baz}}'};
}}
GET http://localhost:8080/test?test={{JSON.stringify(test)}}
      `);

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests[0].url).toBe('http://localhost:8080/test?test={%22bar%22:%22works%22}');
    });
  });
});
