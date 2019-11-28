import { Session } from 'meteor/session';
import { __ } from '/imports/localization/i18n.js';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { displayLocalizer, displayTicketType, displayStatus } from '/imports/ui_3/helpers/api-display.js';

export function ticketColumns() {
  const communityId = Session.get('activeCommunityId');
  return [
    { data: 'serialId()', title: __('schemaTickets.id.label') },
    { data: 'status', title: __('schemaTopics.status.label'), render: displayStatus },
    { data: '_id', title: __('schemaTickets.title.label'), render: Render.displayTitle },
    { data: 'ticket.localizer', title: __('schemaTickets.ticket.localizer.label'), render: l => displayLocalizer(l, communityId) },
    { data: 'creator()', title: __('reportedBy') },
    { data: 'createdAt', title: __('reportedAt'), render: Render.formatTime },
    { data: 'ticket.type', title: __('schemaTickets.ticket.type.label'), render: displayTicketType },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'topics', actions: '', size: 'sm' }),
    },
  ];
}
