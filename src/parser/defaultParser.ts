import { HttpRegionParser } from '../models';
import { CommentHttpRegionParser } from './commentHttpRegionParser';
import { GqlHttpRegionParser } from './gqlHttpRegionParser';
import { IntellijHttpRegionParser } from './intellijHttpRegionParser';
import { JsHttpRegionParser } from './jsHttpRegionParser';
import { MetaHttpRegionParser } from './metaHttpRegionParser';
import { NoteMetaHttpRegionParser } from './noteMetaHttpRegionParser';
import { RequestBodyHttpRegionParser } from './requestBodyHttpRegionParser';
import { RequestHttpRegionParser } from './requestHttpRegionParser';
import { ResponseHttpRegionParser } from './responseHttpRegionParser';
import { ResponseRefHttpRegionParser } from './responseRefHttpRegionParser';
import { VariableHttpRegionParser } from './variableHttpRegionParser';

export const defaultParsers: Array<HttpRegionParser> = [
  new MetaHttpRegionParser(),
  new CommentHttpRegionParser(),
  new VariableHttpRegionParser(),
  new JsHttpRegionParser(),
  new NoteMetaHttpRegionParser(),
  new IntellijHttpRegionParser(),
  new GqlHttpRegionParser(),
  new RequestHttpRegionParser(),
  new ResponseRefHttpRegionParser(),
  new ResponseHttpRegionParser(),
  new RequestBodyHttpRegionParser(),
];
