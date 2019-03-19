import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';

import { Topics } from '/imports/api/topics/topics.js';
import { ticketsSchema } from '/imports/api/topics/tickets/tickets.js';
import { ticketColumns } from '/imports/api/topics/tickets/tables.js';
import { afTicketInsertModal, afTicketUpdateModal, afTicketStatusChangeModal, deleteTicketConfirmAndCallModal }
  from '/imports/ui_3/views/components/tickets-edit.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/blocks/chopped.js';
import './tickets-report.html';

Template.Tickets_report.viewmodel({
  activesOnly: false,
  filterUserId: null,
  searchText: '',
  statusColor(value) {
    return Topics.statusColors[value];
  },
  urgencyColor(value) {
    return Topics.urgencyColors[value];
  },
  activeClassForActives() {
    return this.activesOnly() && 'active';
  },
  activeClassForUser() {
    return this.filterUserId() && 'active';
  },
  tickets() {
    const communityId = Session.get('activeCommunityId');
    const selector = { communityId, category: 'ticket' };
    if (this.activesOnly()) selector['ticket.status'] = { $ne: 'closed' };
    if (this.filterUserId()) selector.userId = this.filterUserId();
    let topicsList = Topics.find(selector, { sort: { createdAt: -1 } }).fetch();
    if (this.searchText()) {
      topicsList = topicsList.filter(t =>
          t.title.toLowerCase().search(this.searchText().toLowerCase()) >= 0
       || t.text.toLowerCase().search(this.searchText().toLowerCase()) >= 0
      );
    }
    return topicsList;
  },
  recentTickets() {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category: 'ticket',
      createdAt: { $gt: moment().subtract(2, 'week').toDate() },
    }, { sort: { createdAt: -1 } });
  },
});

Template.Tickets_report.events({
  'click .js-new'() {
    afTicketInsertModal();
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    afTicketUpdateModal(id);
  },
  'click .js-status'(event) {
    const id = $(event.target).data('id');
    afTicketStatusChangeModal(id);
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    deleteTicketConfirmAndCallModal(id);
  },
  'click .js-filter-actives'(event, instance) {
    $(event.target).blur();
    const oldValue = instance.viewmodel.activesOnly();
    instance.viewmodel.activesOnly(!oldValue);
  },
  'click .js-filter-user'(event, instance) {
    $(event.target).blur();
    if (instance.viewmodel.filterUserId() === null) {
      instance.viewmodel.filterUserId(Meteor.userId());
    } else instance.viewmodel.filterUserId(null);
  },
  'keyup .js-search'(event, instance) {
    instance.viewmodel.searchText(event.target.value);
  },
});
