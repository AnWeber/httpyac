import { HttpFile } from '../httpRegion';

export function httpResponseVariableProvider(httpFile: HttpFile) {
  return Promise.resolve(
    Object.assign(
      {},
      ...httpFile.httpRegions.map(obj => {
        let result: Record<string, any> = {};
        if (obj.name && obj.response) {
          result = { [obj.name]: obj.response.body };
        }
        return result;
      })
    )
  );
}