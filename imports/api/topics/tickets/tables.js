import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';

export function ticketColumns(permissions) {
  const ticketButtonRenderers = [];
  if (permissions.edit) ticketButtonRenderers.push(Render.ticketEditButton);
  if (permissions.delete) ticketButtonRenderers.push(Render.ticketDeleteButton);
  ticketButtonRenderers.push(Render.ticketStatusButton);
  ticketButtonRenderers.push(Render.ticketCommentButton);

  return [
    { data: 'ticket.readableId', title: __('schemaTickets.id.label'), render: Render.ticketId },
    { data: 'status', title: __('schemaTopics.status.label'), render: Render.ticketStatus },
    { data: 'title', title: __('schemaTickets.title.label') },
    { data: '_id', title: __('schemaTickets.ticket.localizer.label'), render: Render.ticketLocalizer },
    { data: 'createdBy()', title: __('reportedBy') },
    { data: 'createdAt', title: __('reportedAt'), render: Render.formatTime },
    { data: 'ticket.type', title: __('schemaTickets.ticket.type.label'), render: Render.translateWithScope('schemaTickets.ticket.type') },
    { data: '_id', title: __('Action buttons'), render: Render.ticketButtonGroup(ticketButtonRenderers) },
  ];
}
