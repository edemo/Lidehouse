import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { $ } from 'meteor/jquery';

import { onSuccess, handleError, displayMessage, displayError } from '/imports/ui_3/lib/errors.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/components/ticket-list.js';
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
    const id = $(event.target).data('id');
    Session.set('activeContractId', id);
    const schemaWithMoreDates = new SimpleSchema([Tickets.schema, {
      moreDates: { type: [Date], optional: true },
    }]);
    schemaWithMoreDates.i18n('schemaTickets');
    Modal.show('Autoform_edit', {
      id: 'af.worksheets.insert',
      schema: schemaWithMoreDates,
      fields: ['title', 'text',
        'ticket.type', 'ticket.localizer', 'ticket.chargeType', 'ticket.expectedStart',
        'moreDates',
      ],
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

AutoForm.addModalHooks('af.worksheets.insert');
AutoForm.addHooks('af.worksheets.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.userId = Meteor.userId();
    doc.category = 'ticket';
    doc.status = Tickets.workflows[doc.ticket.type].start[0].name;
    doc.ticket.contractId = Session.get('activeContractId');
    doc.moreDates = doc.moreDates || [];
    return doc;
  },
  onSubmit(doc) {
    AutoForm.validateForm('af.worksheets.insert');
    const afContext = this;
    const results = [];
    function insert(ticket) {
      Topics.methods.insert.call(ticket, function handler(err, res) {
        if (err) {
          displayError(err);
          afContext.done(err);
          return;
        }
        results.push(res);
        if (results.length === doc.moreDates.length + 1) afContext.done(null, results);
      });
    }
    insert(doc);
    doc.moreDates.forEach((date) => {
      doc.ticket.expectedStart = date;
      insert(doc);
    });
    return false;
  },
  onSuccess(formType, result) {
    Session.set('activeContractId');  // clear it
  },
});
