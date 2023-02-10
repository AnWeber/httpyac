import { javascriptProvider } from '../../io';
import * as models from '../../models';
import { provideAssertValueXPath } from './provideAssertValueXPath';
import { xmlResponseInterceptor } from './xmlResponseInterceptor';
import { xpathVariableReplacer } from './xpathVariableReplacer';
import * as xmldom from '@xmldom/xmldom';
import * as xpath from 'xpath';

export function registerXmlPuglin(api: models.HttpyacHooksApi) {
  api.hooks.onResponse.addInterceptor(xmlResponseInterceptor);
  api.hooks.provideAssertValue.addHook('xpath', provideAssertValueXPath);
  api.hooks.replaceVariable.addHook('xpath', xpathVariableReplacer, { before: ['javascript'] });
  javascriptProvider.require.xpath = xpath;
  javascriptProvider.require['@xmldom/xmldom'] = xmldom;
}
