import { QuestionMap } from 'inquirer';
import { HttpFile, HttpRegion } from '../../store';
import { selectHttpFiles } from './selectHttpFiles';

function createHttpFile(name: string, httpRegions: Array<Record<string, string>>) {
  const httpFile = new HttpFile(name);
  httpRegions.forEach((metaData, index) => {
    const httpRegion = new HttpRegion(httpFile, index);
    httpFile.httpRegions.push(httpRegion);
    Object.assign(httpRegion.metaData, metaData);
    httpRegion.symbol.name = metaData.name;
  });
  return httpFile;
}

describe('selectHttpFiles', () => {
  const defaultHttpFiles: Array<HttpFile> = [
    createHttpFile('test1', [
      {
        name: 'foo1',
        tag: 'foo',
      },
      {
        name: 'foo2',
        tag: 'foo',
      },
      {
        name: 'foo3',
        tag: 'bar',
      },
      {
        name: 'foo4',
        tag: 'bar',
      },
      {
        name: 'foo5',
        tag: 'fuu',
      },
    ]),
    createHttpFile('test2', [
      {
        name: 'test1',
        tag: 'test',
      },
      {
        name: 'test2',
        tag: 'test',
      },
    ]),
  ];
  it('should export', () => {
    expect(selectHttpFiles).toBeDefined();
  });

  it('should return all values', async () => {
    const result = await selectHttpFiles(defaultHttpFiles, { all: true });

    expect(result.length).toBe(2);
    expect(result.map(h => h.httpFile.fileName)).toEqual(['test1', 'test2']);
    expect(result.map(h => h.httpRegions)).toEqual([undefined, undefined]);
  });
  it('should return values by name', async () => {
    const result = await selectHttpFiles(defaultHttpFiles, { name: 'foo1' });

    expect(result.length).toBe(1);
    expect(result.map(h => h.httpFile.fileName)).toEqual(['test1']);
    expect(result.map(h => h.httpRegions?.map(hr => hr.metaData.name))).toEqual([['foo1']]);
  });
  it('should return values by tag', async () => {
    const result = await selectHttpFiles(defaultHttpFiles, { tag: ['foo', 'fuu'] });

    expect(result.length).toBe(1);
    expect(result.map(h => h.httpFile.fileName)).toEqual(['test1']);
    expect(result.map(h => h.httpRegions?.map(hr => hr.metaData.name))).toEqual([['foo1', 'foo2', 'foo5']]);
  });
  it('should return values by line', async () => {
    const result = await selectHttpFiles(defaultHttpFiles, { line: 1 });

    expect(result.length).toBe(2);
    expect(result.map(h => h.httpFile.fileName)).toEqual(['test1', 'test2']);
    expect(result.map(h => h.httpRegions?.map(hr => hr.metaData.name))).toEqual([['foo2'], ['test2']]);
  });
  it('should return values by manual input', async () => {
    const inquirer = await import('inquirer');
    Object.assign(inquirer.default, {
      prompt(questions: QuestionMap) {
        const q = questions[0];
        return {
          region: q.choices[1],
        };
      },
    });
    const result = await selectHttpFiles(defaultHttpFiles, {});

    expect(result.length).toBe(1);
    expect(result.map(h => h.httpFile.fileName)).toEqual(['test1']);
    expect(result.map(h => h.httpRegions?.map(hr => hr.metaData.name))).toEqual([['foo1']]);
  });
  it('should return empty on invalid manual input', async () => {
    const inquirer = await import('inquirer');
    Object.assign(inquirer.default, {
      prompt() {
        return {
          region: 'fii',
        };
      },
    });
    const result = await selectHttpFiles(defaultHttpFiles, {});

    expect(result.length).toBe(0);
  });
});
