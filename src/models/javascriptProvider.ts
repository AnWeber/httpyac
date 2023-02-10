import { PathLike } from './pathLike';
import { ProcessorContext } from './processorContext';

export interface JavascriptProvider {
  require: Record<string, unknown>;
  runScript?(
    source: string,
    options: {
      fileName: PathLike;
      lineOffset: number;
      context: Record<string, unknown>;
      require?: Record<string, unknown>;
      deleteVariable?: (key: string) => void;
    }
  ): Promise<Record<string, unknown>>;
  evalExpression(
    expression: string,
    context: ProcessorContext,
    scriptContext?: Record<string, unknown>
  ): Promise<unknown>;
  loadModule?<T>(request: string, context: string, force?: boolean): T | undefined;
  isAllowedKeyword?(keyword: string): boolean;
}
