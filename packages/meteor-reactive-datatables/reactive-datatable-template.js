

Template.ReactiveDatatable.created = function() {
  var data = this.data;
  if (data.subscription) {
    this.autorun(() => data.subscription(this));
  }
};

Template.ReactiveDatatable.rendered = function() {
  var data = this.data;
  var options = data.options();
  var instance = this;

  if (typeof data.tableData !== "function") {
      throw new Meteor.Error('Your tableData must be a function that returns an array via Cursor.fetch(), .map() or another (hopefully reactive) means')
  }

// TODO: If this whole thing was in autorun, the titles translation change can trigger a redraw
// but it does not seem to work. After replacing the wrapper with Jquery, Blaze still doesnt replace it,
// probably does some optimization, and thinks its the same, so doesnt replace.
// Until this is solved, the translation change of the title, only gets updated after a refresh of the page.

  this.autorun(function() {
    if (!instance.subscriptionsReady()) return;

    var reactiveDataTable = new ReactiveDatatable(options);

    // Help Blaze cleanly remove entire datatable when changing template / route by
    // wrapping table in existing element (.datatable_wrapper) defined in the template.
    var table = document.createElement('table');
    var tableClasses = options.tableClasses || "";
    table.className = 'table dataTable ' + tableClasses;

    options.deferRender = true;

    var wrapper = document.createElement('div');
//    wrapper.id = "wrapper_" + Math.floor(Math.random()*1000);   // just to prove Blaze doesnt replace it
    wrapper.className = 'datatable_wrapper';
    wrapper.append(table);

    instance.$('.datatable_wrapper').replaceWith(wrapper);

    // Render the table element and turn it into a DataTable
    var dt = $(table).DataTable(options);
    reactiveDataTable.datatable = dt;

    dt.on('page.dt', function(e, settings) {
        var info = dt.page.info();
        reactiveDataTable.page = info.page;
    });

    // This code helps to stop event bubbling on dataTable buttons, so it doesn't select the row after button click
    // Classic event.stopPropagation() on button doesn't work, cause the table immediately gets the click event
    // ref: https://datatables.net/reference/event/user-select
    dt.on('user-select', function( e, dt, type, cell, originalEvent) {
      if ($(originalEvent.target).closest('.btn').length) e.preventDefault();
    });

    instance.reactiveDataTable = reactiveDataTable;

    instance.autorun(function() {
      instance.reactiveDataTable.cleanup();
      instance.reactiveDataTable.update(data.tableData());
    });
  });
};

Template.ReactiveDatatable.onDestroyed(function () {
  this.reactiveDataTable.cleanup();
});
