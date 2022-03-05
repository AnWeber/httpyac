import { send } from '../httpYacApi';
import * as io from '../io';
import { HttpFileStore } from '../store';
import { promises as fs } from 'fs';
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
  describe('http', () => {
    it('get http', async () => {
      initFileProvider();
      let exchangeIsCalled = false;
      io.httpClientProvider.exchange = request => {
        exchangeIsCalled = true;
        expect(request.url).toBe('https://custom.yac');
        return Promise.resolve({
          statusCode: 200,
          protocol: 'https',
        });
      };
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
        GET https://custom.yac
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
      expect(exchangeIsCalled).toBeTruthy();
    });
    it('get http with multiline', async () => {
      initFileProvider();
      io.httpClientProvider.exchange = request => {
        expect(request.url).toBe('https://custom.yac/bar?test=foo');
        expect(request.method).toBe('GET');
        return Promise.resolve({
          statusCode: 200,
          protocol: 'https',
        });
      };
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
GET https://custom.yac
  /bar
  ?test=foo
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
    });
    it('get http with headers', async () => {
      initFileProvider();
      io.httpClientProvider.exchange = request => {
        expect(request.url).toBe('https://custom.yac');
        expect(request.method).toBe('GET');
        expect(request.headers?.Authorization).toBe('Bearer test');
        return Promise.resolve({
          statusCode: 200,
          protocol: 'https',
        });
      };
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
GET https://custom.yac
Authorization: Bearer test
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
    });
    it('post http', async () => {
      initFileProvider();
      let exchangeIsCalled = false;
      const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
      io.httpClientProvider.exchange = request => {
        exchangeIsCalled = true;
        expect(request.url).toBe('https://custom.yac');
        expect(request.method).toBe('POST');
        expect(request.body).toBe(body);
        return Promise.resolve({
          statusCode: 200,
          protocol: 'https',
        });
      };
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
POST https://custom.yac
Content-Type: application/json

${body}
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
      expect(exchangeIsCalled).toBeTruthy();
    });
    it('imported body', async () => {
      const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
      initFileProvider({
        'body.json': body,
      });
      let exchangeIsCalled = false;
      io.httpClientProvider.exchange = request => {
        exchangeIsCalled = true;
        expect(request.url).toBe('https://custom.yac');
        expect(request.method).toBe('POST');
        expect(request.body).toBe(body);
        return Promise.resolve({
          statusCode: 200,
          protocol: 'https',
        });
      };
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
POST https://custom.yac
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
      expect(exchangeIsCalled).toBeTruthy();
    });
    it('imported buffer body', async () => {
      const body = JSON.stringify({ foo: 'foo', bar: 'bar' }, null, 2);
      initFileProvider({
        'body.json': body,
      });
      let exchangeIsCalled = false;
      io.httpClientProvider.exchange = request => {
        exchangeIsCalled = true;
        expect(request.url).toBe('https://custom.yac');
        expect(request.method).toBe('POST');
        expect(Buffer.isBuffer(request.body)).toBeTruthy();
        expect(request.body.toString('utf-8')).toBe(body);
        return Promise.resolve({
          statusCode: 200,
          protocol: 'https',
        });
      };
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
POST https://custom.yac
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
      expect(exchangeIsCalled).toBeTruthy();
    });
  });
  describe('graphql', () => {
    it('query + operation + variables', async () => {
      initFileProvider();
      let exchangeIsCalled = false;
      io.httpClientProvider.exchange = request => {
        exchangeIsCalled = true;
        expect(request.url).toBe('https://custom.yac/graphql');
        expect(request.body).toBe(
          '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
        );
        return Promise.resolve({
          statusCode: 200,
          protocol: 'https',
        });
      };
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
POST  https://custom.yac/graphql

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
        {
          workingDir: __dirname,
        }
      );

      const result = await send({
        httpFile,
      });
      expect(result).toBeTruthy();
      expect(exchangeIsCalled).toBeTruthy();
    });
    it('query with fragment', async () => {
      initFileProvider();
      let exchangeIsCalled = false;
      io.httpClientProvider.exchange = request => {
        exchangeIsCalled = true;
        expect(request.url).toBe('https://api.spacex.land/graphql');
        expect(request.body).toBe(
          '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      ...RocketParts\\n    }\\n  }\\n}\\nfragment RocketParts on LaunchRocket {\\n  rocket_name\\n  first_stage {\\n    cores {\\n      flight\\n      core {\\n        reuse_count\\n        status\\n      }\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
        );
        return Promise.resolve({
          statusCode: 200,
          protocol: 'https',
        });
      };
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

POST https://api.spacex.land/graphql HTTP/1.1
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
        {
          workingDir: __dirname,
        }
      );

      const result = await send({
        httpFile,
      });
      expect(result).toBeTruthy();
      expect(exchangeIsCalled).toBeTruthy();
    });
    it('only query', async () => {
      initFileProvider();
      let exchangeIsCalled = false;
      io.httpClientProvider.exchange = request => {
        exchangeIsCalled = true;
        expect(request.url).toBe('https://api.spacex.land/graphql');
        expect(request.method).toBe('POST');
        expect(request.body).toBe(
          '{"query":"query company_query {\\n  company {\\n    coo\\n  }\\n}","operationName":"company_query"}'
        );
        return Promise.resolve({
          statusCode: 200,
          protocol: 'https',
        });
      };
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
POST https://api.spacex.land/graphql
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
      expect(exchangeIsCalled).toBeTruthy();
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
      let exchangeIsCalled = false;
      io.httpClientProvider.exchange = request => {
        exchangeIsCalled = true;
        expect(request.url).toBe('https://api.spacex.land/graphql');
        expect(request.method).toBe('POST');
        expect(request.body).toBe(
          '{"query":"\\nquery launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}\\n        ","operationName":"launchesQuery","variables":{"limit":10}}'
        );
        return Promise.resolve({
          statusCode: 200,
          protocol: 'https',
        });
      };
      const httpFileStore = new HttpFileStore();
      const httpFile = await httpFileStore.getOrCreate(
        `any.http`,
        async () =>
          Promise.resolve(`
POST https://api.spacex.land/graphql
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
      expect(exchangeIsCalled).toBeTruthy();
    });
  });
});
