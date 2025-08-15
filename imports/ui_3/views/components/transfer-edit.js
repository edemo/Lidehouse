import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';

import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import '/imports/ui_3/views/modals/modal-guard.js';
import { Clock } from '/imports/utils/clock';
import { Transactions } from '/imports/api/accounting/transactions.js';
import './transfer-edit.html';

Template.Transfer_edit.viewmodel({
  onCreated() {
  },
  afDoc(formId) {
    const doc = Transactions._transform(AutoForm.getDoc(formId));
    return doc;
  },
  docField(name) {
    const doc = this.afDoc();
    return doc && Object.getByString(doc, name);
  },
  defaultDate() {
    return Clock.currentTime();
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
