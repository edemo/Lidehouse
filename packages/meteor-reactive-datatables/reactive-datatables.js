ReactiveDatatable = function(options) {
	var self = this;

	this.options = options = _.defaults(options, {
		// Any of these can be overriden by passing an options
		// object into your ReactiveDatatable template (see readme)
//		stateSave: true,
//		stateDuration: -1, // Store data for session only
		pageLength: 10,
		lengthMenu: [10, 25, 100, 250, 1000],
		columnDefs: [{ // Global default blank value to avoid popup on missing data
			targets: '_all',
			defaultContent: '-'
		}],
//		stateLoadParams: function(settings, data) {
			// Make it easy to change to the stored page on .update()
//			self.page = data.start / data.length;
//		}
	});
};

ReactiveDatatable.renderWithData = function(...params) {
  const view = Blaze.renderWithData(...params);
  const cell = params.pop();
  $(cell).data('view', view);
}

ReactiveDatatable.prototype.update = function(data) {
	if (!data) return;
	var self = this;

	self.datatable
		.clear()
		.rows.add(data)
		.draw(false)
		.page(self.page || 0) // XXX: Can we avoid drawing twice?
		.draw(false);		  // I couldn't get the page drawing to work otherwise
};

ReactiveDatatable.prototype.cleanup = function() {
  this.datatable.cells().every( function () {
    const nodeData = $(this.node()).data();
    if (!_.isEmpty(nodeData)) {
      Blaze.remove(nodeData.view);
      $(this.node()).removeData('view');
    }
  });
}
