import { BrowserPolicy } from 'meteor/browser-policy';

// https://stackoverflow.com/questions/30280370/how-does-content-security-policy-work#30280371

BrowserPolicy.content.disallowInlineScripts();

BrowserPolicy.content.allowSameOriginForAll();
BrowserPolicy.content.allowOriginForAll('data:');
BrowserPolicy.content.allowOriginForAll('https://fonts.googleapis.com');
BrowserPolicy.content.allowOriginForAll('https://fonts.gstatic.com');
