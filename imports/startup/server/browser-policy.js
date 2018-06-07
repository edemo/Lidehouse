import { BrowserPolicy } from 'meteor/browser-policy';

BrowserPolicy.content.disallowInlineScripts();

BrowserPolicy.content.allowSameOriginForAll();
BrowserPolicy.content.allowOriginForAll('data:');
BrowserPolicy.content.allowOriginForAll('https://fonts.googleapis.com');
BrowserPolicy.content.allowOriginForAll('https://fonts.gstatic.com');
