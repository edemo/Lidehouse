Template.ReactiveDatatable.rendered = function() {
  const data = this.data;
  const options = data.options();
  const instance = this;

  if (typeof data.tableData !== "function") {
      throw new Meteor.Error('Your tableData must be a function that returns an array via Cursor.fetch(), .map() or another (hopefully reactive) means')
  }

// TODO: If this whole thing was in autorun, the titles translation change can trigger a redraw
// but it does not seem to work. After replacing the wrapper with Jquery, Blaze still doesnt replace it,
// probably does some optimization, and thinks its the same, so doesnt replace.
// Until this is solved, the translation change of the title, only gets updated after a refresh of the page.

//  this.autorun(function() {

    const reactiveDataTable = new ReactiveDatatable(options);

    // Help Blaze cleanly remove entire datatable when changing template / route by
    // wrapping table in existing element (.datatable_wrapper) defined in the template.
    const table = document.createElement('table');
    const tableClasses = options.tableClasses || "";
    table.className = 'table dataTable ' + tableClasses;

    const wrapper = document.createElement('div');
//    wrapper.id = "wrapper_" + Math.floor(Math.random()*1000);   // just to prove Blaze doesnt replace it
    wrapper.className = 'datatable_wrapper';
    wrapper.append(table);

    instance.$('.datatable_wrapper').replaceWith(wrapper);

    // Render the table element and turn it into a DataTable
    const dt = $(table).DataTable(options);
    reactiveDataTable.datatable = dt;

    dt.on('page.dt', function(e, settings) {
        const info = dt.page.info();
        reactiveDataTable.page = info.page;
    });

  this.autorun(function() {
    reactiveDataTable.update(data.tableData());
  });
};
