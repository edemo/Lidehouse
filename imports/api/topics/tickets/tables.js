import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { __ } from '/imports/localization/i18n.js';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import { displayLocalizer, displayTicketType, displayStatus, displayUrgency } from '/imports/ui_3/helpers/api-display.js';
import { Topics } from '/imports/api/topics/topics.js';

export function ticketColumns() {
  const communityId = Session.get('activeCommunityId');
  return [
    { data: 'serialId', title: __('schemaTickets.id.label') },
    { data: '_id', title: __('schemaTickets.title.label'), render: Render.displayTitle },
    { data: 'unseenCommentCount()', render: Render.badge,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Badge,
        { color: 'info', value: cellData }, cell),
    },
    { data: 'status', title: __('schemaTopics.status.label'), render: displayStatus },
    { data: 'ticket.localizer', title: __('schemaTickets.ticket.localizer.label'), render: l => displayLocalizer(l, communityId) },
    { data: 'creator().displayOfficialName()', title: __('reportedBy') },
    { data: 'createdAt', title: __('reportedAt'), render: Render.formatTime },
    { data: 'ticket.urgency', title: __('schemaTickets.ticket.urgency.label'), render: displayUrgency },
    { data: 'ticket.type', title: __('schemaTickets.ticket.type.label'), render: displayTicketType },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'topics', actions: '', size: 'sm' }, cell),
    },
  ];
}
