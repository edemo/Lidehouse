import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { handleError, onSuccess } from '/imports/ui_3/lib/errors.js';
import { ParcelBillings } from '/imports/api/accounting/parcel-billings/parcel-billings.js';
import { parcelBillingsAppliesColumns } from '/imports/api/accounting/parcel-billings/tables.js';
import { DatatablesExportButtons } from '/imports/ui_3/views/blocks/datatables.js';

import './parcel-billings-last-applies.html';

Template.ParcelBillings_lastApplies.viewmodel({
  tableData: [],
  onCreated(instance) {
    const parcelBilling = instance.data;
    ParcelBillings.methods.getLastApplies.call({ _id: parcelBilling._id }, 
      onSuccess((res) => { this.tableData(res); })
    );
  },
  tableDataFn() {
    return this.tableData;
  },
  optionsFn() {
    return () => ({
      columns: parcelBillingsAppliesColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      ...DatatablesExportButtons,
    });
  },
});
