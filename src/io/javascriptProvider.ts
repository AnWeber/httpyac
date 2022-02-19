import * as models from '../models';

export const javascriptProvider: models.JavascriptProvider = {
  require: {},
  evalExpression: async function evalExpression(expression: string, context: models.ProcessorContext) {
    return context.variables[expression];
  },
};
