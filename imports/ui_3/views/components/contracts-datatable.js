import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { Contracts } from '/imports/api/contracts/contracts.js';
import { contractsColumns } from '/imports/api/contracts/tables.js';
import { DatatablesExportButtons, DatatablesSelectButtons } from '/imports/ui_3/views/blocks/datatables.js';

import './contracts-datatable.html';

Template.Contracts_datatable.viewmodel({
  onCreated(instance) {
    const communityId = this.templateInstance.data.communityId;
    instance.subscribe('contracts.inCommunity', { communityId });
  },
  tableDataFn() {
    const communityId = this.templateInstance.data.communityId;
    const relations = this.templateInstance.data.relations;
    return () => Contracts.find({ communityId, relation: { $in: relations } }).fetch();
  },
  optionsFn() {
    return () => ({
      columns: contractsColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      ...DatatablesExportButtons,
      ...DatatablesSelectButtons(Contracts),
    });
  },
});
