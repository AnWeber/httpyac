import { initFileProvider, initHttpClientProvider, sendHttp } from '../../../test/testUtils';

describe('request.graphql', () => {
  it('query + operation + variables', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

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
    `
    );

    expect(requests[0].url).toBe(`/graphql`);
    expect(requests[0].body).toBe(
      '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
    );
  });

  it('should replace variables in query', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

    await sendHttp(
      `
@sku=1
POST /graphql

query getit {
  product( id: "gid://shopify/Product/{{sku}}" ) {
    id
    status
  }
}
    `
    );

    expect(requests[0].url).toBe(`/graphql`);
    expect(requests[0].body).toBe(
      '{"query":"query getit {\\n  product( id: \\"gid://shopify/Product/1\\" ) {\\n    id\\n    status\\n  }\\n}","operationName":"getit"}'
    );
  });

  it('query + operation + variable replacement', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

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
    `
    );

    expect(requests[0].url).toBe(`/graphql`);
    expect(requests[0].body).toBe(
      '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
    );
  });

  it('query + operation + loop', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();
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
        host: ``,
      }
    );

    expect(requests[0].url).toBe(`/graphql`);
    expect(requests[0].body).toBe(
      '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
    );
  });

  it('query + operation + partial variable replacement', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

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
        host: ``,
      }
    );

    expect(requests[0].url).toBe(`/graphql`);
    expect(requests[0].body).toBe(
      '{"query":"query launchesQuery($limit: ComplexInput!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":{"foo":10,"bar":20}}}'
    );
  });

  it('query with fragment', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

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
        host: ``,
      }
    );

    expect(requests[0].url).toBe(`/graphql`);
    expect(requests[0].body).toBe(
      '{"query":"query launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      ...RocketParts\\n    }\\n  }\\n}\\nfragment RocketParts on LaunchRocket {\\n  rocket_name\\n  first_stage {\\n    cores {\\n      flight\\n      core {\\n        reuse_count\\n        status\\n      }\\n    }\\n  }\\n}","operationName":"launchesQuery","variables":{"limit":10}}'
    );
  });

  it('only query', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

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
        host: ``,
      }
    );

    expect(requests[0].url).toBe(`/graphql`);
    expect(requests[0].body).toBe(
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
    const requests = initHttpClientProvider();

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
        host: ``,
      }
    );

    expect(requests[0].url).toBe(`/graphql`);
    expect(requests[0].body).toBe(
      '{"query":"\\nquery launchesQuery($limit: Int!){\\n  launchesPast(limit: $limit) {\\n    mission_name\\n    launch_date_local\\n    launch_site {\\n      site_name_long\\n    }\\n    rocket {\\n      rocket_name\\n      rocket_type\\n    }\\n    ships {\\n      name\\n      home_port\\n      image\\n    }\\n  }\\n}\\n        ","operationName":"launchesQuery","variables":{"limit":10}}'
    );
  });
  it('use graphql method', async () => {
    initFileProvider();
    const requests = initHttpClientProvider();

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
        host: ``,
      }
    );

    expect(requests[0].url).toBe(`/graphql`);
    expect(requests[0].body).toBe(
      '{"query":"query company_query {\\n  company {\\n    coo\\n  }\\n}","operationName":"company_query"}'
    );
  });
  it('imported buffer body with replace', async () => {
    const body = JSON.stringify({ foo: 'foo', bar: '{{bar}}' }, null, 2);
    initFileProvider({ 'body.json': body });
    const requests = initHttpClientProvider();

    await sendHttp(
      `
@bar=bar2
POST /post
content-type: application/json

<@ ./body.json
      `,
      {
        host: ``,
      }
    );

    expect(requests[0].headers?.['content-type']).toBe('application/json');
    expect(requests[0].body).toBe(JSON.stringify({ foo: 'foo', bar: 'bar2' }, null, 2));
  });
});
