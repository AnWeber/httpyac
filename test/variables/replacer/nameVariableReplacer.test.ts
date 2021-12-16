import * as models from '../../../src/models';
import { replaceVariableNames } from '../../../src/variables/replacer/nameVariableReplacer';

describe('nameVariableReplacer', () => {
  describe('replaceVariableNames', () => {
    it('should return same value', async () => {
      const result = await replaceVariableNames('foo', 'unittest', {} as models.ProcessorContext);
      expect(result).toEqual('foo');
    });
    it('should return same value and do nothing', async () => {
      const result = await replaceVariableNames(23, 'unittest', {} as models.ProcessorContext);
      expect(result).toEqual(23);
    });
    it('should return replaced value', async () => {
      const result = await replaceVariableNames('foo{{foo}} {{foo}}', 'unittest', {
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
      const result = await replaceVariableNames('foo={{tested}}', 'unittest', {
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
      const result = await replaceVariableNames('foo={{tested}}', 'unittest', {
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
      const result = await replaceVariableNames('foo={{foo}}', 'unittest', {
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
    it('should not change javascript expression', async () => {
      const result = await replaceVariableNames('foo={{1+2}}', 'unittest', {
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
      expect(result).toEqual(`foo={{1+2}}`);
    });
    it('should return non replaced value', async () => {
      const result = await replaceVariableNames(`foo={{bar}}`, 'unittest', {
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
