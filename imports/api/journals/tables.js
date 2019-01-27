import { Session } from 'meteor/session';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { AccountSpecification } from './account-specification';

Render.journalEntries = function (cellData, renderType, currentRow) {
  const entries = cellData;
  const entry = entries[0];
  if (entry.amount) return `<span class="label label-warning label-xs">${__('Split')}</span> `;
  return AccountSpecification.fromDoc(entry).display();
};

export function journalColumns() {
  const columns = [
    { data: 'valueDate', title: __('schemaJournals.valueDate.label'), render: Render.formatDate },
//    { data: 'phase', title: __('schemaJournals.phase.label'), render: Render.translate },
    { data: 'amount', title: __('schemaJournals.amount.label'), render: Render.formatNumber },
    { data: 'credit', title: __('schemaJournals.credit.label'), render: Render.journalEntries },
    { data: 'debit', title: __('schemaJournals.debit.label'), render: Render.journalEntries },
//    { data: 'placeAccounts()', title: __('Konyveles hely'), render: Render.breakdowns },
    { data: 'ref', title: __('schemaJournals.ref.label') },
    { data: 'note', title: __('schemaJournals.note.label') },
    { data: '_id', render: Render.buttonView },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];

  return columns;
}
