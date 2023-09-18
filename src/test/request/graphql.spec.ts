import { getLocal } from 'mockttp';

import { initFileProvider, sendHttp } from '../testUtils';

describe('request.graphql', () => {
  const localServer = getLocal();
  beforeAll(async () => await localServer.start());
  afterAll(async () => await localServer.stop());

  it('query + operation + variables', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);

    await sendHttp(
      `
POST /graphql

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
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/graphql`);
    expect(await requests[0].body.getText()).toBe(
      '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
    );
  });

  it('query + operation + variable replacement', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);

    await sendHttp(
      `
{{
  exports.variables = {
    "limit": 10
  };
}}

POST /graphql

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

{{ variables }}
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/graphql`);
    expect(await requests[0].body.getText()).toBe(
      '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
    );
  });

  it('query + operation + loop', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);

    await sendHttp(
      `
{{
  exports.variables = {
    "limit": 10
  };
}}

# @loop for 1
POST /graphql

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

{{ variables }}
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/graphql`);
    expect(await requests[0].body.getText()).toBe(
      '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
    );
  });

  it('query + operation + partial variable replacement', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);

    await sendHttp(
      `
{{
  exports.variables = {
    "foo": 10,
    "bar": 20
  };
}}

POST /graphql

query launchesQuery($limit: ComplexInput!){
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
  "limit": {{ variables }}
}
    `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/graphql`);
    expect(await requests[0].body.getText()).toBe(
      '{"query":"query launchesQuery($limit: ComplexInput!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":{"foo":10,"bar":20}}}'
    );
  });

  it('query with fragment', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);

    await sendHttp(
      `
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

POST /graphql HTTP/1.1
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
      `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/graphql`);
    expect(await requests[0].body.getText()).toBe(
      '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      ...RocketParts\\n    }\\n  }\\n}\\nfragment RocketParts on LaunchRocket {\\n  rocket_name\\n  first_stage {\\n    cores {\\n      flight\\n      core {\\n        reuse_count\\n        status\\n      }\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
    );
  });

  it('only query', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);

    await sendHttp(
      `
POST /graphql
Content-Type: application/json

query company_query {
  company {
    coo
  }
}
      `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/graphql`);
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

    await sendHttp(
      `
POST /graphql
Content-Type: application/json

gql launchesQuery < ./graphql.gql

{
    "limit": 10
}
      `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/graphql`);
    expect(await requests[0].body.getText()).toBe(
      '{"query":"\\nquery launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}\\n        ","operationName":"launchesQuery","variables":{"limit":10}}'
    );
  });
  it('use graphql method', async () => {
    initFileProvider();
    const mockedEndpoints = await localServer.forPost('/graphql').thenReply(200);

    await sendHttp(
      `
GRAPHQL /graphql
Content-Type: application/json

query company_query {
  company {
    coo
  }
}
      `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].url).toBe(`http://localhost:${localServer.port}/graphql`);
    expect(await requests[0].body.getText()).toBe(
      '{"query":"query company_query {\\n  company {\\n    coo\\n  }\\n}","operationName":"company_query"}'
    );
  });
  it('imported buffer body with replace', async () => {
    const body = JSON.stringify({ foo: 'foo', bar: '{{bar}}' }, null, 2);
    initFileProvider({ 'body.json': body });
    const mockedEndpoints = await localServer.forPost('/post').thenReply(200);

    await sendHttp(
      `
@bar=bar2
POST /post
Content-Type: application/json

<@ ./body.json
      `,
      {
        host: `http://localhost:${localServer.port}`,
      }
    );

    const requests = await mockedEndpoints.getSeenRequests();
    expect(requests[0].headers['content-type']).toBe('application/json');
    expect(await requests[0].body.getText()).toBe(JSON.stringify({ foo: 'foo', bar: 'bar2' }, null, 2));
  });
});
