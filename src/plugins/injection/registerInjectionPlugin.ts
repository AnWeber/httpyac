import * as models from '../../models';
import { AsciidocInterceptor } from './asciidocInterceptor';
import { MarkdownInterceptor } from './markdownInterceptor';

export function registerInjectionPlugin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addInterceptor(new MarkdownInterceptor());
  api.hooks.parse.addInterceptor(new AsciidocInterceptor());
}
