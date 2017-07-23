import { TAPi18n } from 'meteor/tap:i18n';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

const __ = TAPi18n.__;

export function ticketColumns() {
  return [
    { data: 'title', title: __('schemaTickets.title.label') },
    { data: 'ticket.type', title: __('schemaTickets.ticket.type.label'), render: Render.translate },
    { data: 'createdBy()', title: __('reportedBy') },
    { data: 'createdAt', title: __('reportedAt'), render: Render.formatTime },
    { data: 'ticket.urgency', title: __('schemaTickets.ticket.urgency.label'), render: Render.translate },
    { data: 'ticket.status', title: __('schemaTickets.ticket.status.label'), render: Render.translate },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}
