import { Meteor } from 'meteor/meteor';
import { __ } from '/imports/localization/i18n.js';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import { displayLocalizer, displayTicketType, displayStatus, displayUrgency } from '/imports/ui_3/helpers/api-display.js';
import { Topics } from '/imports/api/topics/topics.js';

export function ticketColumns() {
  const communityId = ModalStack.getVar('communityId');
  return [
    { data: 'serialId', title: __('schemaTickets.id.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'topics', actions: 'view,edit,statusUpdate,statusChange,delete', size: 'sm' }, cell),
    },
    { data: '_id', title: __('schemaTickets.title.label'), render: Render.displayTitle },
    { data: 'blueBadgeCount()', render: Render.badge,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Badge,
        { color: 'info', value: cellData }, cell),
    },
//    { data: 'hasAttachment()', render: Render.paperclip },
    { data: 'status', title: __('schemaTopics.status.label'), render: displayStatus },
    { data: 'ticket.localizer', title: __('schemaTickets.ticket.localizer.label'), render: l => displayLocalizer(l, communityId) },
    { data: 'creator().displayOfficialName()', title: __('reportedBy') },
    { data: 'createdAt', title: __('reportedAt'), render: Render.formatTime },
    { data: 'displayStart()', title: __('Start date'), render: Render.formatDate },
    { data: 'ticket.urgency', title: __('schemaTickets.ticket.urgency.label'), render: displayUrgency },
    { data: 'ticket.type', title: __('schemaTickets.ticket.type.label'), render: displayTicketType },
  ];
}
