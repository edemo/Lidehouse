import { BrowserPolicy } from 'meteor/browser-policy';

// https://stackoverflow.com/questions/30280370/how-does-content-security-policy-work#30280371
// Setting taken from https://dweldon.silvrback.com/browser-policy

BrowserPolicy.framing.disallow();
BrowserPolicy.content.disallowInlineScripts();
BrowserPolicy.content.disallowEval();
BrowserPolicy.content.allowInlineStyles();
BrowserPolicy.content.allowFontDataUrl();
BrowserPolicy.content.allowSameOriginForAll();
BrowserPolicy.content.allowOriginForAll('data:');
BrowserPolicy.content.allowOriginForAll('https://fonts.googleapis.com');
BrowserPolicy.content.allowOriginForAll('https://fonts.gstatic.com');
BrowserPolicy.content.allowImageOrigin('*');
