import { $ } from 'meteor/jquery';
import { __ } from '/imports/localization/i18n.js';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';

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

export const DatatablesSelectButtons = {
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
        alert(dt.rows({ selected: true }).indexes().length + ' row(s) selected');
      },
    },
  ],
};
