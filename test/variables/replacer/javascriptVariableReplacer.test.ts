import { log } from '../../../src/io';
import * as models from '../../../src/models';
import { replaceJavascriptExpressions } from '../../../src/variables/replacer/javascriptVariableReplacer';

describe('javascriptVariableReplacer', () => {
  describe('replaceJavascriptExpressions', () => {
    it('should return same value', async () => {
      const result = await replaceJavascriptExpressions('foo', 'unittest', {} as models.ProcessorContext);
      expect(result).toEqual('foo');
    });
    it('should return same value and do nothing', async () => {
      const result = await replaceJavascriptExpressions(23, 'unittest', {} as models.ProcessorContext);
      expect(result).toEqual(23);
    });
    it('should return replaced value', async () => {
      const result = await replaceJavascriptExpressions('foo{{foo}} {{foo}}', 'unittest', {
        variables: {
          foo: 'bar',
        },
        httpFile: {
          fileName: 'test',
        },
        httpRegion: {
          symbol: {
            startLine: 1,
          },
        },
      } as unknown as models.ProcessorContext);
      expect(result).toEqual('foobar bar');
    });
    it('should return replaced date value', async () => {
      const tested = new Date();
      const result = await replaceJavascriptExpressions('foo={{tested}}', 'unittest', {
        variables: {
          tested,
        },
        httpFile: {
          fileName: 'test',
        },
        httpRegion: {
          symbol: {
            startLine: 1,
          },
        },
      } as unknown as models.ProcessorContext);
      expect(result).toEqual(`foo=${tested.toISOString()}`);
    });
    it('should return replaced json value', async () => {
      const result = await replaceJavascriptExpressions('foo={{tested}}', 'unittest', {
        variables: {
          tested: {
            foo: 'bar',
          },
        },
        httpFile: {
          fileName: 'test',
        },
        httpRegion: {
          symbol: {
            startLine: 1,
          },
        },
      } as unknown as models.ProcessorContext);
      expect(result).toEqual(`foo={"foo":"bar"}`);
    });
    it('should return replaced nested value', async () => {
      const result = await replaceJavascriptExpressions('foo={{foo}}', 'unittest', {
        variables: {
          foo: '{{bar}}',
          bar: 'bar2',
        },
        httpFile: {
          fileName: 'test',
        },
        httpRegion: {
          symbol: {
            startLine: 1,
          },
        },
      } as unknown as models.ProcessorContext);
      expect(result).toEqual(`foo=bar2`);
    });
    it('should return replaced javascript expression', async () => {
      const result = await replaceJavascriptExpressions('foo={{1+2}}', 'unittest', {
        variables: {},
        httpFile: {
          fileName: 'test',
        },
        httpRegion: {
          symbol: {
            startLine: 1,
          },
        },
      } as unknown as models.ProcessorContext);
      expect(result).toEqual(`foo=3`);
    });
    it('should return non replaced value', async () => {
      jest.spyOn(log, 'warn').mockImplementation();
      const result = await replaceJavascriptExpressions(`foo={{bar}}`, 'unittest', {
        variables: {},
        httpFile: {
          fileName: 'test',
        },
        httpRegion: {
          symbol: {
            startLine: 1,
          },
        },
      } as unknown as models.ProcessorContext);
      expect(result).toEqual(`foo={{bar}}`);
    });
  });
});
