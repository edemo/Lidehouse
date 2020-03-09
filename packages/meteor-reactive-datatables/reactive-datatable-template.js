// droka changes --- memory cleanup
class Store {
  constructor() { 
    this.store = {};
  }
  get(id) {
    console.log("Getting", id, "from store");
    this.store[id] = this.store[id] || [];
    return this.store[id];
  }
};
const BlazeRenderedViews = new Store();

Blaze.cleanRenderWithData = function cleanRenderWithData(id, ...params) {
  const view = Blaze.renderWithData(...params);
  BlazeRenderedViews.get(id).push(view);
  console.log('BlazeRenderedViews', 'id', BlazeRenderedViews.get(id).length);
};
// ---

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

//  this.autorun(function() {

    var reactiveDataTable = new ReactiveDatatable(options);
    // droka changes --- memory cleanup
    console.log("options", options);
    reactiveDataTable.viewsToClean = BlazeRenderedViews.get(options.id);
    // ---

    // Help Blaze cleanly remove entire datatable when changing template / route by
    // wrapping table in existing element (.datatable_wrapper) defined in the template.
    var table = document.createElement('table');
    var tableClasses = options.tableClasses || "";
    table.className = 'table dataTable ' + tableClasses;

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

  this.autorun(function() {
    reactiveDataTable.update(data.tableData());
  });
};

Template.ReactiveDatatable.destroyed = function() {
  // droka changes --- memory cleanup
  const id = this.data.options().id;
  const viewsToClean = BlazeRenderedViews.get(id);
  console.log(`Destroying ${viewsToClean.length} views`);
  viewsToClean.forEach(v => Blaze.remove(v));
  viewsToClean.splice(0, viewsToClean.length);
  // ---
};
