import { log } from '../io';

interface BaseHookItem {
  id: string;
  before?: Array<string>;
  after?: Array<string>;
}

export const HookCancel = Symbol('cancel hook run');

export interface HookItem<T, TReturn> extends BaseHookItem {
  action(arg: T, arg1?: unknown, arg2?: unknown): TReturn | typeof HookCancel | Promise<TReturn | typeof HookCancel>;
}

export interface HookInterceptor<T, TReturn> {
  register?(item: HookItem<T, TReturn>): boolean;
  beforeLoop?(context: HookTriggerContext<T, TReturn>): Promise<boolean | undefined>;
  beforeTrigger?(context: HookTriggerContext<T, TReturn>): Promise<boolean | undefined>;
  afterTrigger?(context: HookTriggerContext<T, TReturn>): Promise<boolean | undefined>;
  afterLoop?(context: HookTriggerContext<T, TReturn>): Promise<boolean | undefined>;
}

export interface HookTriggerContext<T, TReturn> {
  index: number;
  length: number;
  arg: T;
  hookItem?: HookItem<T, TReturn>;
}

export abstract class Hook<T, TReturn, TTriggerResult, TArg = undefined, TArg2 = undefined> {
  protected items: Array<HookItem<T, TReturn>>;
  protected interceptors: Array<HookInterceptor<T, TReturn>>;

  id: string;

  constructor(private readonly bailOut?: ((arg: TReturn) => boolean) | undefined) {
    this.id = this.constructor.name;
    this.items = [];
    this.interceptors = [];
  }

  hasHook(id: string) {
    return this.items.some(obj => obj.id === id);
  }

  addHook(
    id: string,
    action: (arg: T, arg1: TArg, arg2: TArg2) => TReturn | typeof HookCancel | Promise<TReturn | typeof HookCancel>,
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
      const index = Math.min(...this.getIndeces(item.before));
      if (index >= 0) {
        this.items.splice(index, 0, item);
        return;
      }
    }
    if (item.after) {
      const index = Math.max(...this.getIndeces(item.after));
      if (index >= 0) {
        this.items.splice(index + 1, 0, item);
        return;
      }
    }
    this.items.push(item);
  }

  private getIndeces(ids: Array<string>) {
    return ids.map(before => this.items.findIndex(obj => obj.id === before)).filter(obj => obj >= 0);
  }

  addObjHook<TObj extends BaseHookItem>(
    getAction: (obj: TObj) => (arg: T, arg1?: TArg, arg2?: TArg2) => Promise<TReturn | typeof HookCancel>,
    ...objs: TObj[]
  ): void {
    for (const obj of objs) {
      this.addHook(obj.id, getAction(obj).bind(obj), obj);
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

  addInterceptor(interceptor: HookInterceptor<T, TReturn>): void {
    this.interceptors.push(interceptor);
  }
  removeInterceptor(interceptor: HookInterceptor<T, TReturn>): boolean {
    const index = this.interceptors.indexOf(interceptor);
    if (index >= 0) {
      this.interceptors.splice(index, 1);
      return true;
    }
    return false;
  }

  async trigger(arg: T, arg1?: TArg, arg2?: TArg2): Promise<TTriggerResult | typeof HookCancel> {
    const results: TReturn[] = [];
    const context: HookTriggerContext<T, TReturn> = {
      index: 0,
      length: this.items.length,
      arg,
    };

    if ((await this.intercept(obj => obj.beforeLoop, context)) === false) {
      return HookCancel;
    }

    while (context.index < context.length) {
      context.hookItem = this.items[context.index];
      log.trace(`${this.id}: ${context.hookItem.id} started`);
      try {
        if ((await this.intercept(obj => obj.beforeTrigger, context)) === false) {
          return HookCancel;
        }

        const result = await context.hookItem.action(context.arg, arg1, arg2);
        if (result === HookCancel) {
          return HookCancel;
        }
        if (this.bailOut && this.bailOut(result)) {
          results.push(result);
          return this.getMergedResults(results, arg);
        }
        results.push(result);
        context.arg = this.getNextArg(result, arg);

        if ((await this.intercept(obj => obj.afterTrigger, context)) === false) {
          return HookCancel;
        }
        context.index++;
      } catch (err) {
        log.error(`${this.id}: ${context.hookItem.id} failed`);
        throw err;
      }
    }
    if ((await this.intercept(obj => obj.afterLoop, context)) === false) {
      return HookCancel;
    }
    return this.getMergedResults(results, arg);
  }

  private async intercept(
    method: (
      interceptor: HookInterceptor<T, TReturn>
    ) => ((context: HookTriggerContext<T, TReturn>) => Promise<boolean | void>) | undefined,
    context: HookTriggerContext<T, TReturn>
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

  protected abstract getNextArg(_next: TReturn, current: T): T;

  protected abstract getMergedResults(results: TReturn[], arg: T): TTriggerResult;
}

export class SeriesHook<T, TReturn, TBail = void, TArg = undefined, TArg2 = undefined> extends Hook<
  T,
  TReturn | TBail,
  Array<TReturn>,
  TArg,
  TArg2
> {
  constructor(bailOut?: ((arg: TReturn | TBail) => boolean) | undefined) {
    super(bailOut);
  }
  protected getNextArg(_next: TReturn, current: T): T {
    return current;
  }

  protected getMergedResults(results: TReturn[]): TReturn[] {
    return results;
  }
}

export class BailSeriesHook<T, TReturn, TBail = void, TArg = undefined, TArg2 = undefined> extends Hook<
  T,
  TReturn | TBail,
  TReturn | undefined,
  TArg,
  TArg2
> {
  constructor(bailOut?: ((arg: TReturn | TBail | undefined) => boolean) | undefined) {
    super(bailOut);
  }
  protected getNextArg(_next: TReturn, current: T): T {
    return current;
  }

  protected getMergedResults(results: TReturn[]): TReturn | undefined {
    return results.pop();
  }
}

export class WaterfallHook<T, TBail = T, TArg = undefined, TArg2 = undefined> extends Hook<
  T,
  T | TBail,
  T | TBail,
  TArg,
  TArg2
> {
  constructor(bailOut?: ((arg: T | TBail) => boolean) | undefined) {
    super(bailOut);
  }
  protected getNextArg(next: T): T {
    return next;
  }

  protected getMergedResults(results: T[], arg: T): T {
    return results.pop() || arg;
  }
}
