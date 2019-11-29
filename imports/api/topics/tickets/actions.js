import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { debugAssert } from '/imports/utils/assert.js';
import { onSuccess, handleError, displayMessage, displayError } from '/imports/ui_3/lib/errors.js';
import { __ } from '/imports/localization/i18n.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/modals/confirmation.js';

import './entities.js';

AutoForm.addModalHooks('af.ticket.insert');
AutoForm.addHooks('af.ticket.insert', {
  formToDoc(doc) {
    if (!doc.ticket) doc.ticket = {};
//    doc.ticket.type = Session.get('activeTicketType');
    doc.status = Tickets.workflows[doc.ticket.type].start[0].name;
//    doc.ticket.contractId = Session.get('activeContractId');
    doc.moreDates = doc.moreDates || [];
    return doc;
  },
  onSubmit(doc) {
    AutoForm.validateForm('af.ticket.insert');
    const moreDates = doc.moreDates;
    delete doc.moreDates;
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
        if (results.length === moreDates.length + 1) afContext.done(null, results);
      });
    }
    insert(doc);
    if (!moreDates) return false;

    const expectedLength = (doc.ticket.expectedStart && doc.ticket.expectedFinish) ?
      moment(doc.ticket.expectedFinish).diff(moment(doc.ticket.expectedStart)) : undefined;
    moreDates.forEach((date) => {
      if (!date) return;
      doc.ticket.expectedStart = date;
      if (expectedLength) doc.ticket.expectedFinish = moment(date).add(expectedLength).toDate();
      insert(doc);
    });
    return false;
  },
  onSuccess(formType, result) {
//    Session.set('activeTicketType');  // clear it
//    Session.set('activeContractId');  // clear it
  },
});

AutoForm.addModalHooks('af.ticket.statusChange');
AutoForm.addHooks('af.ticket.statusChange', {
  formToDoc(doc) {
    const newStatusName = Session.get('newStatusName');
    doc.topicId = Session.get('activeTopicId');
    doc.status = newStatusName;
    doc.data = doc.ticket || {};
    delete doc.ticket;
    return doc;
  },
  onSuccess(formType, result) {
    Session.set('activeTopicId');  // clear it
    Session.set('newStatusName');  // clear it
  },
});
