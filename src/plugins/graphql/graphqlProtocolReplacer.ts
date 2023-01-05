import * as models from '../../models';

export async function graphqlProtocolReplacer(request: models.Request): Promise<void> {
  if (request.method?.toUpperCase() === 'GRAPHQL') {
    request.method = 'POST';
  }
}
