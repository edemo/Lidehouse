datatables_i18n = {
  "en": {
    "decimal":        "",
    "emptyTable":     "No data available in table",
    "info":           "Showing _START_ to _END_ of _TOTAL_ entries",
    "infoEmpty":      "Showing 0 to 0 of 0 entries",
    "infoFiltered":   "(filtered from _MAX_ total entries)",
    "infoPostFix":    "",
    "thousands":      ",",
    "lengthMenu":     "Show _MENU_ entries",
    "loadingRecords": "Loading...",
    "processing":     "Processing...",
    "search":         "Search:",
    "zeroRecords":    "No matching records found",
    "paginate": {
        "first":      "First",
        "last":       "Last",
        "next":       "Next",
        "previous":   "Previous"
    },
    "aria": {
        "sortAscending":  ": activate to sort column ascending",
        "sortDescending": ": activate to sort column descending"
    }
  },

  "hu": {
    "sEmptyTable":     "Nincs rendelkezésre álló adat",
    "sInfo":           "Találatok: _START_ - _END_ Összesen: _TOTAL_",
    "sInfoEmpty":      "Nulla találat",
    "sInfoFiltered":   "(_MAX_ összes rekord közül szűrve)",
    "sInfoPostFix":    "",
    "sInfoThousands":  " ",
    "sLengthMenu":     "_MENU_ találat oldalanként",
    "sLoadingRecords": "Betöltés...",
    "sProcessing":     "Feldolgozás...",
    "sSearch":         "Keresés:",
    "sZeroRecords":    "Nincs a keresésnek megfelelő találat",
    "oPaginate": {
        "sFirst":    "Első",
        "sPrevious": "Előző",
        "sNext":     "Következő",
        "sLast":     "Utolsó"
    },
    "oAria": {
        "sSortAscending":  ": aktiválja a növekvő rendezéshez",
        "sSortDescending": ": aktiválja a csökkenő rendezéshez"
    }
  }
};

console.log(datatables_i18n);

ReactiveDatatable = function(options) {
	var self = this;

	this.options = options = _.defaults(options, {
		// Any of these can be overriden by passing an options
		// object into your ReactiveDatatable template (see readme)
		stateSave: true,
		stateDuration: -1, // Store data for session only
		pageLength: 5,
		lengthMenu: [3, 5, 10, 50, 100],
		columnDefs: [{ // Global default blank value to avoid popup on missing data
			targets: '_all',
			defaultContent: '–––'
		}],
		stateLoadParams: function(settings, data) {
			// Make it easy to change to the stored page on .update()
			self.page = data.start / data.length;
		}
	});
};

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
