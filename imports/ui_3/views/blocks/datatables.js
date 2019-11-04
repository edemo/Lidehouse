import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
// import { handleError } from '/imports/ui_3/lib/errors.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/confirmation.js';

export const DatatablesExportButtons = {
  // coming from the theme:
  dom: '<"html5buttons"B>lTfgitp',
  buttons: [
    { extend: 'copy' },
    { extend: 'csv' },
    { extend: 'excel', title: 'honline' },
    { extend: 'pdf', title: 'honline' },
    { extend: 'print',
      customize(win) {
        $(win.document.body).addClass('white-bg');
        $(win.document.body).css('font-size', '10px');
        $(win.document.body).find('table')
            .addClass('compact')
            .css('font-size', 'inherit');
      },
    },
  ],
};

export const DatatablesSelectButtons = function(batchMethod) {
  return {
    dom: '<"html5buttons"B>lTfgitp',
  //  select: true,
    select: {
      style: 'multi',
  //    selector: 'td:first-child',
    },
  //  columnDefs: [{
  //    targets: 0,
  //    className: 'select-checkbox',
  //    orderable: false,
  //  }],
    buttons: [
      { extend: 'selectAll',
        text: () => __('Select all'),
      },
      { extend: 'selectNone',
        text: () => __('Select none'),
      },
      { extend: 'selected',
        text: () => __('Action with selected'),
        action(e, dt, button, config) {
          const selectedDocs = dt.rows({ selected: true }).data();
          const selectedIds = _.pluck(selectedDocs, '_id');
          // alert(selectedDocs.length + ' row(s) selected');
          Modal.confirmAndCall(batchMethod, { args: selectedIds.map(_id => ({ _id })) }, {
            action: batchMethod.name,
            message: __('This operation will be performed on many documents', selectedDocs.length),
          });
        },
      },
    ],
  };
};
