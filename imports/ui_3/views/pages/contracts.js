import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { $ } from 'meteor/jquery';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/components/ticket-list.html';
import './contracts.html';

Template.Contracts.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('contracts.inCommunity', { communityId });
  });
});

Template.Contracts.helpers({
  contracts() {
    const communityId = Session.get('activeCommunityId');
    return Contracts.find({ communityId });
  },
});

Template.Contracts.events({
  'click .js-new'(event) {
    Modal.show('Autoform_edit', {
      id: 'af.contract.insert',
      collection: Contracts,
      type: 'method',
      meteormethod: 'contracts.insert',
    });
  },
  'click .js-edit'(event) {
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
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(Contracts.methods.remove, { _id: id }, {
      action: 'delete contract',
      message: 'This will not delete worksheets',
    });
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
