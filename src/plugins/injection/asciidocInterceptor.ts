import { CodeBlockInterceptor } from './codeBlocksInterceptor';

export class AsciidocInterceptor extends CodeBlockInterceptor {
  id = 'asciidoc';
  constructor() {
    super(['adoc', 'asciidoc', 'asc'], [/^\[source,http\]\s*$/iu, /^----\s*$/u], /^----\s*$/u);
  }
}
