import { $ } from 'meteor/jquery';

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
