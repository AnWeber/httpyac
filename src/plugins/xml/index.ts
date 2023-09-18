import * as xmldom from '@xmldom/xmldom';
import * as xpath from 'xpath';

import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { provideAssertValueXPath } from './provideAssertValueXPath';
import { xmlResponseInterceptor } from './xmlResponseInterceptor';
import { parseXpathNamespace } from './xpathNamespaceHttpRegionParser';
import { xpathVariableReplacer } from './xpathVariableReplacer';

export function registerXmlPuglin(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('xpath_ns', parseXpathNamespace, { before: ['variable'] });
  api.hooks.onResponse.addInterceptor(xmlResponseInterceptor);
  api.hooks.provideAssertValue.addHook('xpath', provideAssertValueXPath);
  api.hooks.replaceVariable.addHook('xpath', xpathVariableReplacer, { before: ['javascript'] });
  javascriptProvider.require.xpath = xpath;
  javascriptProvider.require['@xmldom/xmldom'] = xmldom;
}
