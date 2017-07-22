import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';

const __ = TAPi18n.__;

function formatTime(cellData, renderType, currentRow) {
  return moment(cellData).format('YYYY.MM.DD hh:mm');
}

function translate(cellData, renderType, currentRow) {
  return __(cellData);
}

function renderDeleteButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-delete nav-item icon-trash"></span>`;
  return html;
}

function renderEditButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-edit nav-item icon-edit"></span>`;
  return html;
}

export function ticketColumns() {
  return [
    { data: 'title', title: __('schemaTickets.title.label') },
    { data: 'ticket.type', title: __('schemaTickets.ticket.type.label'), render: translate },
    { data: 'createdBy()', title: __('reportedBy') },
    { data: 'createdAt', title: __('reportedAt'), render: formatTime },
    { data: 'ticket.urgency', title: __('schemaTickets.ticket.urgency.label'), render: translate },
    { data: 'ticket.status', title: __('schemaTickets.ticket.status.label'), render: translate },
    { data: '_id', render: renderEditButton },
    { data: '_id', render: renderDeleteButton },
  ];
}
