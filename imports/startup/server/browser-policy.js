import { BrowserPolicy } from 'meteor/browser-policy';

// https://stackoverflow.com/questions/30280370/how-does-content-security-policy-work#30280371

BrowserPolicy.framing.disallow();
BrowserPolicy.content.allowInlineScripts();
BrowserPolicy.content.disallowEval();
BrowserPolicy.content.allowInlineStyles();
BrowserPolicy.content.allowFontDataUrl();
BrowserPolicy.content.allowSameOriginForAll();
BrowserPolicy.content.allowOriginForAll('data:');
BrowserPolicy.content.allowOriginForAll('https://fonts.googleapis.com');
BrowserPolicy.content.allowOriginForAll('https://fonts.gstatic.com');
BrowserPolicy.content.allowImageOrigin('*');
BrowserPolicy.content.allowFrameOrigin('meet.jit.si');
BrowserPolicy.content.allowOriginForAll('https://drive.google.com');
BrowserPolicy.content.allowOriginForAll('https://www.googletagmanager.com');
BrowserPolicy.content.allowOriginForAll('https://connect.facebook.net');
