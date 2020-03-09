import { Session } from 'meteor/session';
import { __ } from '/imports/localization/i18n.js';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import { displayLocalizer, displayTicketType, displayStatus, displayUrgency } from '/imports/ui_3/helpers/api-display.js';

export function ticketColumns() {
  const communityId = Session.get('activeCommunityId');
  return [
    { data: 'serialId', title: __('schemaTickets.id.label') },
    { data: '_id', title: __('schemaTickets.title.label'), render: Render.displayTitle },
    { data: 'status', title: __('schemaTopics.status.label'), render: displayStatus },
    { data: 'ticket.localizer', title: __('schemaTickets.ticket.localizer.label'), render: l => displayLocalizer(l, communityId) },
    { data: 'creator()', title: __('reportedBy') },
    { data: 'createdAt', title: __('reportedAt'), render: Render.formatTime },
    { data: 'ticket.urgency', title: __('schemaTickets.ticket.urgency.label'), render: displayUrgency },
    { data: 'ticket.type', title: __('schemaTickets.ticket.type.label'), render: displayTicketType },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => Blaze.cleanRenderWithData('tickets', Template.Action_buttons_group,
        { doc: cellData, collection: 'topics', actions: '', size: 'sm' }, cell),
    },
  ];
}
