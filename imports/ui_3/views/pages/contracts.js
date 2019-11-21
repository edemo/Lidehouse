import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { $ } from 'meteor/jquery';

import { Partners } from '/imports/api/transactions/partners/partners.js';
import '/imports/api/transactions/partners/actions.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import '/imports/api/contracts/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { importCollectionFromFile } from '/imports/utils/import.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { afTicketInsertModal } from '/imports/ui_3/views/components/tickets-edit.js';
import '/imports/ui_3/views/components/ticket-list.js';
import './contracts.html';

Template.Contracts.viewmodel({
  activePartnerRelation: 'supplier',
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = Session.get('activeCommunityId');
      instance.subscribe('contracts.inCommunity', { communityId });
      instance.subscribe('partners.inCommunity', { communityId });
    });
  },
  autorun() {
    Session.set('activePartnerRelation', this.activePartnerRelation());
  },
  partnerRelations() {
    return ['supplier', 'customer'];
  },
  activeClass(partnerRelation) {
    return (this.activePartnerRelation() === partnerRelation) && 'active';
  },
  contracts() {
    const communityId = Session.get('activeCommunityId');
    const relation = Session.get('activePartnerRelation');
    return Contracts.find({ communityId }).fetch().filter(c => c.partner().relation === relation);
  },
  ticketStatuses() {
    return Object.values(Tickets.statuses);
  },
  ticketTypes() {
    return Tickets.typeValues;
  },
});

Template.Contracts.events({
  ...(actionHandlers(Partners)),
  ...(actionHandlers(Contracts)),
  'click .worksheets .js-add'(event) {
    const type = $(event.target).closest('a').data('type');
    const id = $(event.target).data('id');
    afTicketInsertModal(type, id);
  },
  'click .worksheets .js-import'(event, instance) {
    importCollectionFromFile(Topics); // TODO Make it Ticket specific
  },
  'click .js-relation-filter'(event, instance) {
    const partnerRelation = $(event.target).closest('[data-value]').data('value');
    instance.viewmodel.activePartnerRelation(partnerRelation);
    Session.set('activePartnerRelation', partnerRelation);
  },
});
