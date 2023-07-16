import { ProcessorContext } from '../../models';

export interface XPathProcessorContext extends ProcessorContext {
  options: {
    xpath_namespaces?: Record<string, string>;
  };
}
