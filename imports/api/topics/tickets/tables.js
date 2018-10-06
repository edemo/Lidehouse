import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';

export function ticketColumns() {
  return [
    { data: 'title', title: __('schemaTickets.title.label') },
    { data: 'text', title: __('schemaTickets.text.label') },
    { data: 'ticket.category', title: __('schemaTickets.ticket.category.label'), render: Render.translateWithScope('schemaTickets.ticket.category') },
    { data: 'createdBy()', title: __('reportedBy') },
    { data: 'createdAt', title: __('reportedAt'), render: Render.formatTime },
    { data: 'ticket.urgency', title: __('schemaTickets.ticket.urgency.label'), render: Render.translateWithScope('schemaTickets.ticket.urgency') },
    { data: 'ticket.status', title: __('schemaTickets.ticket.status.label'), render: Render.translateWithScope('schemaTickets.ticket.status') },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}
