import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { $ } from 'meteor/jquery';

import { Partners } from '/imports/api/transactions/partners/partners.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { importCollectionFromFile } from '/imports/utils/import.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { afTicketInsertModal } from '/imports/ui_3/views/components/tickets-edit.js';
import '/imports/ui_3/views/components/ticket-list.js';
import './contracts.html';

Template.Contracts.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('contracts.inCommunity', { communityId });
    this.subscribe('partners.inCommunity', { communityId });
  });
});

Template.Contracts.helpers({
  contracts() {
    const communityId = Session.get('activeCommunityId');
    return Contracts.find({ communityId });
  },
  ticketStatuses() {
    return Object.values(Tickets.statuses);
  },
  ticketTypes() {
    return Tickets.typeValues;
  },
});

Template.Contracts.events({
  'click .js-new.partners'(event) {
    Modal.show('Autoform_edit', {
      id: 'af.partner.insert',
      collection: Partners,
      type: 'method',
      meteormethod: 'partners.insert',
    });
  },
  'click .js-new.contracts'(event) {
    Modal.show('Autoform_edit', {
      id: 'af.contract.insert',
      collection: Contracts,
      type: 'method',
      meteormethod: 'contracts.insert',
    });
  },
  'click .contract-details .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.contract.update',
      collection: Contracts,
      doc: Contracts.findOne(id),
      type: 'method-update',
      meteormethod: 'contracts.update',
      singleMethodArgument: true,
    });
  },
  'click .contract-details .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(Contracts.methods.remove, { _id: id }, {
      action: 'delete contract',
      message: 'This will not delete worksheets',
    });
  },
  'click .contract-details .js-add'(event) {
    const type = $(event.target).closest('a').data('type');
    const id = $(event.target).data('id');
    afTicketInsertModal(type, id);
  },
  'click .contract-details .js-import'(event, instance) {
    importCollectionFromFile(Topics); // TODO Make it Ticket specific
  },
});

AutoForm.addModalHooks('af.contract.insert');
AutoForm.addModalHooks('af.contract.update');
AutoForm.addHooks('af.contract.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

AutoForm.addModalHooks('af.partner.insert');
AutoForm.addModalHooks('af.partner.update');
AutoForm.addHooks('af.partner.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
