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
  describe('http', () => {
    it('get http', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/get').thenReply(200);

      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
GET http://localhost:8080/get
`),
        0,
        {}
      );

      const result = await send({
        httpFile,
      });
      expect(result).toBeTruthy();
      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].headers['user-agent']).toBe('httpyac');
    });
    it('get http with multiline', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forGet('/bar').thenReply(200);
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
GET http://localhost:8080
  /bar
  ?test=foo
        `),
        0,
        {}
      );

      const result = await send({
        httpFile,
      });

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].path).toBe('/bar?test=foo');
      expect(result).toBeTruthy();
    });
    it('get http with headers', async () => {
      initFileProvider();

      const mockedEndpoints = await localServer.forGet('/get').thenReply(200);
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
GET http://localhost:8080/get
Authorization: Bearer test
Date: 2015-06-01
        `),
        0,
        {
          workingDir: __dirname,
        }
      );

      const result = await send({
        httpFile,
      });

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].headers.authorization).toBe('Bearer test');
      expect(requests[0].headers.date).toBe('2015-06-01');
      expect(result).toBeTruthy();
    });
    it('post http', async () => {
      initFileProvider();
      const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
      const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
POST http://localhost:8080/post
Content-Type: application/json

${body}
        `),
        0,
        {}
      );
      const result = await send({
        httpFile,
      });
      expect(result).toBeTruthy();
      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].headers['content-type']).toBe('application/json');
      expect(await requests[0].body.getText()).toBe(body);
    });
    it('imported body', async () => {
      const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
      initFileProvider({
        'body.json': body,
      });

      const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
POST http://localhost:8080/post
Content-Type: application/json

<@ ./body.json
        `),
        0,
        {
          workingDir: __dirname,
        }
      );

      const result = await send({
        httpFile,
      });
      expect(result).toBeTruthy();

      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].headers['content-type']).toBe('application/json');
      expect(await requests[0].body.getText()).toBe(body);
    });
    it('imported buffer body', async () => {
      const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
      initFileProvider({
        'body.json': body,
      });
      const mockedEndpoints = await localServer.forPost('/post').thenReply(200);
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
POST http://localhost:8080/post
Content-Type: application/json

< ./body.json
        `),
        0,
        {
          workingDir: __dirname,
        }
      );

      const result = await send({
        httpFile,
      });
      expect(result).toBeTruthy();
      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].headers['content-type']).toBe('application/json');
      expect(await requests[0].body.getText()).toBe(body);
    });
  });
  describe('graphql', () => {
    it('query + operation + variables', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);

      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
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
        `),
        0,
        {}
      );

      const result = await send({
        httpFile,
      });
      expect(result).toBeTruthy();
      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].url).toBe('http://localhost:8080/graphql');
      expect(await requests[0].body.getText()).toBe(
        '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
      );
    });
    it('query with fragment', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
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
        `),
        0,
        {}
      );

      const result = await send({
        httpFile,
      });
      expect(result).toBeTruthy();
      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].url).toBe('http://localhost:8080/graphql');
      expect(await requests[0].body.getText()).toBe(
        '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      ...RocketParts\\n    }\\n  }\\n}\\nfragment RocketParts on LaunchRocket {\\n  rocket_name\\n  first_stage {\\n    cores {\\n      flight\\n      core {\\n        reuse_count\\n        status\\n      }\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
      );
    });
    it('only query', async () => {
      initFileProvider();
      const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
POST http://localhost:8080/graphql
Content-Type: application/json

query company_query {
  company {
    coo
  }
}
        `),
        0,
        {
          workingDir: __dirname,
        }
      );

      const result = await send({
        httpFile,
      });
      expect(result).toBeTruthy();
      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(1);
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

      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
POST http://localhost:8080/graphql
Content-Type: application/json

gql launchesQuery < ./graphql.gql

{
    "limit": 10
}
        `),
        0,
        {
          workingDir: __dirname,
        }
      );

      const result = await send({
        httpFile,
      });
      expect(result).toBeTruthy();
      const requests = await mockedEndpoints.getSeenRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].url).toBe('http://localhost:8080/graphql');
      expect(await requests[0].body.getText()).toBe(
        '{"query":"\\nquery launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}\\n        ","operationName":"launchesQuery","variables":{"limit":10}}'
      );
    });
  });
});
