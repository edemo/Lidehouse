import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { moment } from 'meteor/momentjs:moment';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Clock } from '/imports/utils/clock';
import { __ } from '/imports/localization/i18n.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/ui_3/views/modals/modal-guard.js';
// The autoform needs to see these, to handle new events on it
import '/imports/api/partners/actions.js';
import '/imports/api/contracts/actions.js';
import './bill-edit.html';

Template.Bill_edit.viewmodel({
  afDoc() {
    const doc = Transactions._transform(AutoForm.getDoc());
    return doc;
  },
  isBill() {
    return this.templateInstance.data.doc.category === 'bill';
  },
  defaultDate() {
    return Clock.currentTime();
  },
  defaultDueDate() {
    return moment().add(30, 'day').toDate();
  },
  notNullLine(afLine) {
    // Not the right place to find out if line is null (got removed earlier)
    // Should be dealt with within autoform iterator
    const index = afLine.name.split('.')[1];
//    console.log(AutoForm.getFieldValue('lines')[index]);
    return AutoForm.getFieldValue('lines')[index];
  },
  reconciling() {
    return ModalStack.getVar('statementEntry');
  },
  originalStatementEntry() {
    return ModalStack.getVar('statementEntry')?.original;
  },
  hiddenWhenReconciling() {
    return this.reconciling() && 'hidden';
  },
});

function autoFill(formId) {
  const doc = Transactions._transform(AutoForm.getFormValues(formId).insertDoc);
  doc.autoFill();
  AutoForm.setDoc(doc, formId);
}

Template.Bill_edit.events({
  'change .js-autofill'(event, instance) {
    autoFill();
  },
  'click .js-autofill button'(event, instance) {
    // The click happens beore the line is removed/added, so here we do not yet see the changed doc
    const formId = AutoForm.getFormId();  // The delayed call will need to be told, what formId is
    Meteor.setTimeout(() => autoFill(formId), 1000);
  },
});
