import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/actions.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import '/imports/ui_3/views/blocks/chopped.js';
import '/imports/ui_3/views/components/ticket-list.js';
import './tickets.html';

Template.Tickets.viewmodel({
  activesOnly: false,
  filterCreatedBy: null,
  searchText: '',
  onCreated(instance) {
    ModalStack.setVar('relation', 'supplier', true);
    instance.autorun(() => {
      const communityId = ModalStack.getVar('communityId');
      instance.subscribe('topics.list', { communityId, category: 'ticket' });
      instance.subscribe('contracts.inCommunity', { communityId });
      instance.subscribe('partners.inCommunity', { communityId });
    });
  },
  statusColor(value) {
    return Topics.statusColors[value];
  },
  urgencyColor(value) {
    return Tickets.urgencyColors[value];
  },
  activeClassForActives() {
    return this.activesOnly() && 'active';
  },
  activeClassForUser() {
    return this.filterCreatedBy() && 'active';
  },
  tickets() {
    const communityId = ModalStack.getVar('communityId');
    const selector = { communityId, category: 'ticket', 'ticket.type': 'issue' };
    if (this.activesOnly()) selector.status = { $ne: 'closed' };
    if (this.filterCreatedBy()) selector.creatorId = this.filterCreatedBy();
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
    const communityId = ModalStack.getVar('communityId');
    return Topics.find({ communityId, category: 'ticket', 'ticket.type': 'issue',
      createdAt: { $gt: moment().subtract(2, 'week').toDate() },
    }, { sort: { createdAt: -1 } });
  },
});

Template.Tickets.events({
  'click .js-filter-actives'(event, instance) {
    $(event.target).blur();
    const oldValue = instance.viewmodel.activesOnly();
    instance.viewmodel.activesOnly(!oldValue);
  },
  'click .js-filter-user'(event, instance) {
    $(event.target).blur();
    if (instance.viewmodel.filterCreatedBy() === null) {
      instance.viewmodel.filterCreatedBy(Meteor.userId());
    } else instance.viewmodel.filterCreatedBy(null);
  },
  'keyup .js-search'(event, instance) {
    instance.viewmodel.searchText(event.target.value);
  },
});
