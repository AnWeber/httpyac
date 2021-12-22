interface BaseHookItem {
  id: string;
  before?: Array<string>;
  after?: Array<string>;
}

export const HookCancel = Symbol('cancel hook run');

export interface HookItem<TArgs extends unknown[], TReturn> extends BaseHookItem {
  action(...args: TArgs): TReturn | typeof HookCancel | Promise<TReturn | typeof HookCancel>;
}

export interface HookInterceptor<TArgs extends unknown[], TReturn> {
  register?(item: HookItem<TArgs, TReturn>): boolean;
  beforeLoop?(context: HookTriggerContext<TArgs, TReturn>): Promise<boolean | undefined>;
  beforeTrigger?(context: HookTriggerContext<TArgs, TReturn>): Promise<boolean | undefined>;
  afterTrigger?(context: HookTriggerContext<TArgs, TReturn>): Promise<boolean | undefined>;
  afterLoop?(context: HookTriggerContext<TArgs, TReturn>): Promise<boolean | undefined>;
}

export interface HookTriggerContext<TArgs extends unknown[], TReturn> {
  index: number;
  length: number;
  arg: TArgs[0];
  args: TArgs;
  hookItem?: HookItem<TArgs, TReturn>;
}

export abstract class Hook<TArgs extends unknown[], TReturn, TResult> {
  protected items: Array<HookItem<TArgs, TReturn>>;
  protected interceptors: Array<HookInterceptor<TArgs, TReturn>>;

  id: string;

  constructor(protected readonly bailOut?: ((arg: TReturn) => boolean) | undefined) {
    this.id = this.constructor.name;
    this.items = [];
    this.interceptors = [];
  }

  hasHook(id: string) {
    return this.items.some(obj => obj.id === id);
  }

  addHook(
    id: string,
    action: (...args: TArgs) => TReturn | typeof HookCancel | Promise<TReturn | typeof HookCancel>,
    options?: {
      before?: Array<string>;
      after?: Array<string>;
    }
  ): void {
    const item = {
      id,
      action,
      ...options,
    };
    if (item.before) {
      const index = Math.min(...this.getIndices(item.before));
      if (index >= 0) {
        this.items.splice(index, 0, item);
        return;
      }
    }
    if (item.after) {
      const index = Math.max(...this.getIndices(item.after));
      if (index >= 0) {
        this.items.splice(index + 1, 0, item);
        return;
      }
    }
    this.items.push(item);
  }

  private getIndices(ids: Array<string>) {
    return ids.map(before => this.items.findIndex(obj => obj.id === before)).filter(obj => obj >= 0);
  }

  addObjHook<TObj extends BaseHookItem>(
    getAction: (obj: TObj) => (...args: TArgs) => Promise<TReturn | typeof HookCancel>,
    ...objs: TObj[]
  ): void {
    for (const obj of objs) {
      this.addHook(obj.id, getAction(obj), obj);
    }
  }

  removeHook(id: string): boolean {
    const index = this.items.findIndex(obj => obj.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  addInterceptor(interceptor: HookInterceptor<TArgs, TReturn>): void {
    this.interceptors.push(interceptor);
  }
  removeInterceptor(interceptor: HookInterceptor<TArgs, TReturn>): boolean {
    const index = this.interceptors.indexOf(interceptor);
    if (index >= 0) {
      this.interceptors.splice(index, 1);
      return true;
    }
    return false;
  }

  async trigger(...args: TArgs): Promise<TResult | typeof HookCancel> {
    const results: TReturn[] = [];
    const context: HookTriggerContext<TArgs, TReturn> = {
      index: 0,
      length: this.items.length,
      arg: args[0],
      args,
    };

    if ((await this.intercept(obj => obj.beforeLoop, context)) === false) {
      return HookCancel;
    }

    while (context.index < context.length) {
      context.hookItem = this.items[context.index];
      if ((await this.intercept(obj => obj.beforeTrigger, context)) === false) {
        return HookCancel;
      }
      const result = await context.hookItem.action(...context.args);
      if (result === HookCancel) {
        return HookCancel;
      }
      if (this.bailOut && this.bailOut(result)) {
        results.push(result);
        return this.getMergedResults(results, context.args);
      }
      results.push(result);
      context.args = this.getNextArgs(result, context.args);

      if ((await this.intercept(obj => obj.afterTrigger, context)) === false) {
        return HookCancel;
      }
      context.index++;
    }
    if ((await this.intercept(obj => obj.afterLoop, context)) === false) {
      return HookCancel;
    }
    return this.getMergedResults(results, context.args);
  }

  private async intercept(
    method: (
      interceptor: HookInterceptor<TArgs, TReturn>
    ) => ((context: HookTriggerContext<TArgs, TReturn>) => Promise<boolean | void>) | undefined,
    context: HookTriggerContext<TArgs, TReturn>
  ) {
    for (const interceptor of this.interceptors) {
      const event = method(interceptor);
      if (event) {
        const result = await event.apply(interceptor, [context]);
        if (!result) {
          return false;
        }
      }
    }
    return true;
  }

  merge(hook: Hook<TArgs, TReturn, TResult>) {
    const result = this.initNew();
    result.items.push(...this.items);
    result.items.push(...hook.items);
    result.interceptors.push(...this.interceptors);
    result.interceptors.push(...hook.interceptors);
    return result;
  }

  protected abstract getNextArgs(next: TReturn, args: TArgs): TArgs;

  protected abstract getMergedResults(results: TReturn[], args: TArgs): TResult;

  protected abstract initNew(): Hook<TArgs, TReturn, TResult>;
}

export class SeriesHook<TArgs extends unknown[], TReturn> extends Hook<TArgs, TReturn, Array<TReturn>> {
  constructor(bailOut?: ((arg: TReturn) => boolean) | undefined) {
    super(bailOut);
  }
  protected getNextArgs(_next: TReturn, args: TArgs): TArgs {
    return args;
  }

  protected getMergedResults(results: TReturn[]): TReturn[] {
    return results;
  }

  protected initNew() {
    return new SeriesHook<TArgs, TReturn>(this.bailOut);
  }
}

export class BailHook<TArgs extends unknown[], TReturn> extends Hook<TArgs, TReturn | undefined, TReturn | undefined> {
  constructor(bailOut?: ((arg: TReturn | undefined) => boolean) | undefined) {
    super(bailOut);
  }
  protected getNextArgs(_next: TReturn | undefined, args: TArgs): TArgs {
    return args;
  }

  protected getMergedResults(results: TReturn[]): TReturn | undefined {
    return results.pop();
  }
  protected initNew() {
    return new BailHook<TArgs, TReturn | undefined>(this.bailOut);
  }
}

export class WaterfallHook<TArgs extends unknown[], TBail = TArgs[0]> extends Hook<
  TArgs,
  TArgs[0] | TBail,
  TArgs[0] | TBail
> {
  constructor(bailOut?: ((arg: TArgs[0] | TBail) => boolean) | undefined) {
    super(bailOut);
  }
  protected getNextArgs(next: TArgs[0], args: TArgs): TArgs {
    return args.splice(0, 1, next) as TArgs;
  }

  protected getMergedResults(results: TArgs[0][], args: TArgs): TArgs[0] {
    return results.pop() || args[0];
  }
  protected initNew() {
    return new WaterfallHook<TArgs, TBail>(this.bailOut);
  }
}
