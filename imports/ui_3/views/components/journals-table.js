import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { journalEntriesColumns } from '/imports/api/accounting/journal-entries/tables.js';
import { JournalEntries } from '/imports/api/accounting/journal-entries/journal-entries.js';
import { DatatablesExportButtons } from '/imports/ui_3/views/blocks/datatables.js';

import './journals-table.html';

Template.Journals_table.viewmodel({
  onCreated(instance) {
    const communityId = this.templateInstance.data.communityId;
    instance.subscribe('transactions.inCommunity', { communityId });
  },
  tableDataFn() {
    const communityId = this.templateInstance.data.communityId;
    return () => JournalEntries.find({ communityId }).fetch();
  },
  optionsFn() {
    return () => ({
      columns: journalEntriesColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      ...DatatablesExportButtons,
    });
  },
});
