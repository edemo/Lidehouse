import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { __ } from '/imports/localization/i18n.js';
import { Transactions } from '/imports/api/accounting/transactions.js';

import './transaction-edit.html';

Template.Transaction_edit.viewmodel({
  onCreated(instance) {
  },
  afDoc(formId) {
    const doc = Transactions._transform(AutoForm.getDoc(formId));
    return doc;
  },
  emptyArray() {
    return [];
  },
  reconciling() {
    return ModalStack.getVar('statementEntry');
  },
  hiddenWhenReconciling() {
    return this.reconciling() && 'hidden';
  },
});
