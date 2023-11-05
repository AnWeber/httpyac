import { initFileProvider, parseHttp } from '../../../test/testUtils';

describe('parser', () => {
  initFileProvider();
  it('should parse 3 httpregion', async () => {
    const httpFile = await parseHttp(`
    GET https://httpbin.org/anything
    GET https://httpbin.org/anything
    GET https://httpbin.org/anything
    `);
    expect(await httpFile.fileName).toBe('any.http');
    expect(await httpFile.httpRegions.length).toBe(3);
    for (const httpRegion of httpFile.httpRegions) {
      expect(httpRegion.request).toBeDefined();
      expect(httpRegion.request?.method).toBe('GET');
      expect(httpRegion.request?.url).toBe('https://httpbin.org/anything');

      expect(httpRegion.symbol.source?.trim()).toBe('GET https://httpbin.org/anything');
    }
  });
  it('should support header spread', async () => {
    const httpFile = await parseHttp(`
    {{+
      const token = "test"
      exports.defaultHeaders = {
        'Content-Type': 'text/html',
        'Authorization': \`Bearer \${token}\`
      };
    }}
    ###
    GET https://httpbin.org/anything
    ...defaultHeaders
    GET https://httpbin.org/anything
    ...defaultHeaders
    `);
    expect(await httpFile.fileName).toBe('any.http');
    expect(await httpFile.httpRegions.length).toBe(3);

    const globalRegion = httpFile.httpRegions.shift();
    expect(globalRegion?.request).toBeUndefined();

    for (const httpRegion of httpFile.httpRegions) {
      expect(httpRegion.request).toBeDefined();
      expect(httpRegion.request?.method).toBe('GET');
      expect(httpRegion.request?.method).toBe('GET');
      expect(httpRegion.request?.url).toBe('https://httpbin.org/anything');

      expect(httpRegion.symbol.source?.trim()).toBe(`GET https://httpbin.org/anything\n    ...defaultHeaders`);
    }
  });
  it('should support asserts', async () => {
    const httpFile = await parseHttp(`
    GET https://httpbin.org/anything
    ?? status == 200
    `);
    expect(await httpFile.fileName).toBe('any.http');
    expect(await httpFile.httpRegions.length).toBe(1);

    for (const httpRegion of httpFile.httpRegions) {
      expect(httpRegion.request).toBeDefined();
      expect(httpRegion.request?.url).toBe('https://httpbin.org/anything');
      expect(httpRegion.symbol.children?.length).toBe(2);
      expect(httpRegion.symbol.children?.[0].name).toBe('    GET https://httpbin.org/anything');
      expect(httpRegion.symbol.children?.[0].description).toBe('HTTP request-line');
      expect(httpRegion.symbol.children?.[1].name).toBe('assert status');
      expect(httpRegion.symbol.children?.[1].description).toBe('== 200');
    }
  });
});
