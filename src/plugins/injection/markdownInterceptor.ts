import { CodeBlockInterceptor } from './codeBlocksInterceptor';

export class MarkdownInterceptor extends CodeBlockInterceptor {
  id = 'markdown';
  constructor() {
    super(['md', 'markdown', 'mdown', 'mkdn', 'mdtxt', 'mdtext', 'text', 'rmd'], /^```\s*(http|rest)$/iu, /^```\s*$/u);
  }
}
