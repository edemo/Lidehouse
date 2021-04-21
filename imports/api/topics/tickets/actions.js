import { Meteor } from 'meteor/meteor';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { debugAssert } from '/imports/utils/assert.js';
import { displayError } from '/imports/ui_3/lib/errors.js';
import { __ } from '/imports/localization/i18n.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import '/imports/ui_3/views/modals/confirmation.js';

import '/imports/api/topics/entities.js';

AutoForm.addHooks('af.maintenance.create', {
  onSubmit(doc) {
    AutoForm.validateForm('af.maintenance.create');
    const moreDates = doc.moreDates || [];
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
    return false; // otherwise calls AJAX
  },
});
