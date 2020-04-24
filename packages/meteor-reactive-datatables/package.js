Package.describe({
  name: 'ephemer:reactive-datatables',
  summary: "Fast and reactive jQuery DataTables using standard Cursors / DataTables API. Supports Bootstrap 3.",
  version: "1.2.0",
  git: "https://github.com/droka/meteor-reactive-datatables.git"
});

Package.onUse(function(api) {
  api.versionsFrom('0.9.0');
  api.use(['templating'], 'client');
  api.addFiles([
  	'theme.datatables.min.js',
    'theme.datatables.min.css',
  	'dataTables.select.min.js',
    'dataTables.select.min.css',
    'datatables_i18n.js',
  	'reactive-datatables.js',
  	'reactive-datatable-template.html',
  	'reactive-datatable-template.js',
  ], 'client');
  api.export('ReactiveDatatable', 'client');
  api.export('datatables_i18n');
});
