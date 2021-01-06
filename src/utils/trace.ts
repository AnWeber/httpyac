import { log } from '../logger';
import { isPromise } from './promiseUtils';

export function trace(): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    //@ts-ignore-line
    descriptor.value = traceWrap.bind(this)(target, propertyKey, originalMethod);
    return descriptor;
  };
}

export function traceWrap(target: any, propertyKey: string | symbol, method: (...args: any[]) => any) {
  return function (...args: any[]) {
    const date = new Date();
    try {
      //@ts-ignore-line
      const result = method.apply(this, args);
      if (isPromise(result)) {
        return result.then(result => {
          log.trace(`${target}.${String(propertyKey)}: ${Math.abs((new Date()).getTime() - date.getTime())}ms`);
          return result;
        }).catch(err => {
          log.trace(`${target}.${String(propertyKey)}: ${Math.abs((new Date()).getTime() - date.getTime())}ms`);
          throw err;
        });
      } else {
        log.trace(`${target}.${String(propertyKey)}: ${Math.abs((new Date()).getTime() - date.getTime())}ms`);
      }
      return result;
    } catch (err) {
      log.trace(`${target}.${String(propertyKey)}: ${Math.abs((new Date()).getTime() - date.getTime())}ms`);
      throw err;
    }
  };
}