import { Hook, HookCancel } from 'hookpoint';

import * as models from '../models';
import {
  addHttpFileRequestClientHooks,
  addTestResultToHttpRegion,
  isError,
  parseError,
  toEnvironmentKey,
} from '../utils';

export class HttpRegion implements models.HttpRegion {
  request?: models.Request<string, models.RequestBody> | undefined;
  response?: models.HttpResponse | undefined;
  testResults?: models.TestResult[] | undefined;
  responseRefs?: string[] | undefined;
  readonly variablesPerEnv: Record<string, models.Variables> = {};
  readonly metaData: Record<string, string | true | undefined> = {};
  readonly hooks = {
    execute: new models.ExecuteHook(),
    onRequest: new models.OnRequestHook(),
    onStreaming: new models.OnStreaming(),
    onResponse: new models.OnResponseHook(),
    responseLogging: new models.ResponseLoggingHook(),
  };
  readonly symbol: models.HttpSymbol;

  public constructor(
    private readonly httpFile: models.HttpFile,
    start = 0
  ) {
    this.symbol = new models.HttpSymbol({
      name: '-',
      description: '-',
      kind: models.HttpSymbolKind.request,
      startLine: start,
      startOffset: 0,
      endLine: start,
      endOffset: 0,
    });
  }

  public get id(): string {
    return `${this.httpFile.fileName}_${this.symbol.startLine}`;
  }

  public isGlobal() {
    return !(this.request || this.metaData.name);
  }

  public clone(httpFile?: models.HttpFile) {
    const httpRegion = new HttpRegion(httpFile || this.httpFile);
    httpRegion.request = this.request;
    Object.assign(httpRegion.symbol, this.symbol);
    Object.assign(httpRegion.hooks, this.hooks);
    Object.assign(httpRegion.variablesPerEnv, this.variablesPerEnv);
    Object.assign(httpRegion.metaData, this.metaData);
    return httpRegion;
  }

  public async execute(
    context: models.PartialProperty<models.ProcessorContext, 'httpRegion', 'hooks'>,
    isMainContext?: boolean
  ): Promise<boolean> {
    delete this.response;
    this.testResults = [];

    if (context.httpRegion) {
      this.registerRegionDependent(context.httpRegion);
    }

    context.progress?.report?.({
      message: `${this.symbol.name}`,
    });

    let executeHook: Hook<[models.ProcessorContext], boolean, boolean[]> = this.hooks.execute;

    if (!this.isGlobal()) {
      executeHook = this.httpFile.hooks.execute.merge(executeHook);
      for (const globalRegion of this.httpFile.httpRegions.filter(obj => obj.isGlobal())) {
        if (globalRegion instanceof HttpRegion) {
          globalRegion.registerRegionDependent(this);
        }
      }
    }

    try {
      const result = await executeHook.trigger({
        ...context,
        httpFile: this.httpFile,
        httpRegion: this,
        hooks: addHttpFileRequestClientHooks(this.hooks, this.httpFile),
        isMainContext,
      });
      if (!this.isGlobal()) {
        this.resetDependentRegionsWithVisitor(toEnvironmentKey(context.activeEnvironment), this, []);
      }
      return result !== HookCancel && result.every(obj => !!obj);
    } catch (err) {
      if (isError(err)) {
        addTestResultToHttpRegion(this, {
          message: err.message,
          status: models.TestResultStatus.ERROR,
          error: parseError(err),
        });
        if (!err.handled) {
          await context.logResponse?.(this.response, this);
          err.handled = true;
        }
      }
      return false;
    }
  }
  private dependentsPerEnv: Array<models.HttpRegion> = [];

  private resetDependentRegionsWithVisitor(
    envKey: string,
    refRegion: HttpRegion,
    visitedDependents: Array<models.HttpRegion>
  ): void {
    const unvisitedDependents = refRegion.dependentsPerEnv.filter(d => !visitedDependents.includes(d));
    for (const httpRegion of unvisitedDependents) {
      delete httpRegion.response;
      delete httpRegion.variablesPerEnv[envKey];

      visitedDependents.push(httpRegion);

      if (httpRegion instanceof HttpRegion) {
        this.resetDependentRegionsWithVisitor(envKey, httpRegion, visitedDependents);
      }
    }
  }

  private registerRegionDependent(httpRegion: models.HttpRegion): void {
    if (httpRegion && !this.dependentsPerEnv.includes(httpRegion) && httpRegion !== this) {
      this.dependentsPerEnv.push(httpRegion);
    }
  }
}
