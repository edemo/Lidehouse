import { Session } from 'meteor/session';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';

Render.breakdowns = function (cellData, renderType, currentRow) {
  const accounts = cellData;
  if (!accounts) return undefined;
  let html = '';
  Object.keys(accounts).forEach(key => {
    const breakdown = Breakdowns.findOne({ communityId: Session.get('activeCommunityId'), name: key });
    const labelText = breakdown.leafDisplay(accounts[key]);
    html += `<span class="label label-default label-xs">${labelText}</span> `;
  });
  return html;
};

export function paymentColumns() {
  const columns = [
    { data: 'valueDate', title: __('schemaJournals.valueDate.label'), render: Render.formatDate },
//    { data: 'phase', title: __('schemaJournals.phase.label'), render: Render.translate },
    { data: 'amount', title: __('schemaJournals.amount.label'), render: Render.formatNumber },
    { data: 'accountFrom', title: __('schemaJournals.accountFrom.label'), render: Render.breakdowns },
    { data: 'accountTo', title: __('schemaJournals.accountTo.label'), render: Render.breakdowns },
//    { data: 'placeAccounts()', title: __('Konyveles hely'), render: Render.breakdowns },
    { data: 'ref', title: __('schemaJournals.ref.label') },
    { data: 'note', title: __('schemaJournals.note.label') },
    { data: '_id', render: Render.buttonView },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];

  return columns;
}
