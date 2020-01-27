import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { journalEntriesColumns } from '/imports/api/transactions/journal-entries/tables.js';
import { JournalEntries } from '/imports/api/transactions/journal-entries/journal-entries.js';
//import '/imports/api/transactions/entries/actions.js';
//import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import { DatatablesExportButtons } from '/imports/ui_3/views/blocks/datatables.js';

import './journals-table.html';

Template.Journals_table.viewmodel({
  onCreated(instance) {
    instance.autorun(() => {
      instance.subscribe('transactions.inCommunity', { communityId: getActiveCommunityId() });
    });
  },
  tableDataFn() {
    const communityId = this.templateInstance.data.communityId;
    return () => JournalEntries.find({ communityId }).fetch();
  },
  optionsFn() {
    return () => Object.create({
      columns: journalEntriesColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      ...DatatablesExportButtons,
    });
  },
});
