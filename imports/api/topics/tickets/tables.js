import { Session } from 'meteor/session';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { displayLocalizer, displayTicketType, displayStatus } from '/imports/ui_3/helpers/api-display.js';

export function ticketColumns(permissions) {
  const communityId = Session.get('activeCommunityId');
  const buttonRenderers = [];
  if (permissions.view) buttonRenderers.push(Render.buttonView);
  if (permissions.edit) buttonRenderers.push(Render.buttonEdit);
  if (permissions.edit) buttonRenderers.push(Render.buttonStatusChange);
  if (permissions.delete) buttonRenderers.push(Render.buttonDelete);

  return [
    { data: 'serialId()', title: __('schemaTickets.id.label') },
    { data: 'status', title: __('schemaTopics.status.label'), render: displayStatus },
    { data: 'title', title: __('schemaTickets.title.label') },
    { data: 'ticket.localizer', title: __('schemaTickets.ticket.localizer.label'), render: l => displayLocalizer(l, communityId) },
    { data: 'createdBy()', title: __('reportedBy') },
    { data: 'createdAt', title: __('reportedAt'), render: Render.formatTime },
    { data: 'ticket.type', title: __('schemaTickets.ticket.type.label'), render: displayTicketType },
    { data: '_id', title: __('Action buttons'), render: Render.buttonGroup(buttonRenderers) },
  ];
}
