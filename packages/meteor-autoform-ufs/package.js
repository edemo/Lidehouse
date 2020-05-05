Package.describe({
  name: 'droka:autoform-ufs',
  summary: 'File upload for AutoForm using jalik:ufs',
  description: 'File upload for AutoForm using jalik:ufs',
  version: '0.2.1',
  git: 'https://github.com/droka/meteor-autoform-ufs.git'
});

Package.onUse(function(api) {
  api.versionsFrom('METEOR@1.6.1');

  api.use([
    'check',
    'ecmascript',
    'underscore',
    'mongo',
    'templating@1.3.2',
    'aldeed:autoform@5.8.1',
    'dburles:mongo-collection-instances@0.3.5',
    'manuel:viewmodel@6.3.4',
    'jalik:ufs'
  ]);

  api.addFiles([
    'lib/client/link-format.js',
    'lib/client/autoform.js',
    'lib/client/af-file-upload.html',
    'lib/client/af-file-upload.js',
  ], 'client');
});

Npm.depends({
  'compress.js': '1.1.2'
});