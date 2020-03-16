Package.describe({
  name: 'q42:autoform-markdown',
  version: '2.0.0',
  summary: 'A simple autoform markdown with preview using perak:markdown',
  git: 'https://github.com/Q42/meteor-autoform-markdown',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom(['METEOR@0.9.3', 'METEOR@0.9.4', 'METEOR@1.0']);
  api.use(['templating', 'reactive-var'], 'client');
  api.use(['perak:markdown@1.0.5', 'aldeed:autoform@5.4.1'], 'client');
  api.addFiles([
    'markdown.html',
    'markdown.css',
    'jquery.selection.js',
    'markdown.js'
  ], 'client');

});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('q42:autoform-markdown');
});
