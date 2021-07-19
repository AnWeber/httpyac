import { DotenvVariableProvider } from './dotenvVariableProvider';
import { HttpFileImportsVariableProvider } from './httpFileImportsVariableProvider';
import { HttpFileVariableProvider } from './httpFileVariableProvider';
import { IntellijVariableProvider } from './intellijVariableProvider';
import { IntellijGlobalVariableProvider } from './intellijGlobalVariableProvider';


export const defaultVariableProviders = [
  new DotenvVariableProvider(),
  new HttpFileImportsVariableProvider(),
  new HttpFileVariableProvider(),
  new IntellijVariableProvider(),
  new IntellijGlobalVariableProvider(),
];
