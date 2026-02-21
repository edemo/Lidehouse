import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Communities } from '/imports/api/communities/communities.js';
import { MeterReadings } from '/imports/api/meters/meter-readings/meter-readings.js';
import { meterReadingsColumns } from '/imports/api/meters/meter-readings/tables.js';
import { DatatablesExportButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import '/imports/ui_3/views/blocks/simple-reactive-datatable.js';
import './meter-readings.html';

Template.Meter_readings.viewmodel({
  showApproved: true,
  showUnapproved: true,
  showBilling: false,
  onCreated(instance) {
    // already subsrcibed to MeterReadings in the parent modal (Meters_datatable)
    //   instance.autorun(() => {
    //   });
  },
  tableDataFn() {
    const templateInstance = Template.instance();
    const meterId = templateInstance.data.meter._id;
    const self = this;
    function getTableData() {
      const selector = { meterId };
      const selectedTypes = [];
      if (self.showApproved() || self.showUnapproved())  selectedTypes.push('reading');
      if (self.showBilling()) selectedTypes.push('estimate');
      _.extend(selector, { type: { $in: selectedTypes } });
      if (self.showApproved() && !self.showUnapproved()) _.extend(selector, { approved: true });
      if (!self.showApproved() && self.showUnapproved()) _.extend(selector, { approved: { $ne: true } });  
      return MeterReadings.find(selector, { $sort: { date: -1, createdAt: -1 } }).fetch();
    }
    return getTableData;
  },
  optionsFn() {
    const communityId = this.templateInstance.data.meter.communityId;
    const community = Communities.findOne(communityId);
    return () => ({
      columns: meterReadingsColumns(),
      order: [[0, 'desc']],
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      ...DatatablesExportButtons,
    });
  },
});

Template.Meter_readings.events(
  actionHandlers(MeterReadings, 'create')
);
