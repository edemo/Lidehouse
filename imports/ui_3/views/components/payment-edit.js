import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import '/imports/ui_3/views/modals/modal-guard.js';
import { Clock } from '/imports/utils/clock';
// The autoform needs to see these, to handle new events on it
import '/imports/api/partners/actions.js';
import '/imports/api/contracts/actions.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import '/imports/api/transactions/actions.js';
import './payment-edit.html';

Template.Payment_edit.viewmodel({
  billsView: false,
  onCreated() {
    this.billsView(!!this.templateInstance.data.doc.bills?.length);
  },
  afDoc(formId) {
    const doc = Transactions._transform(AutoForm.getDoc(formId));
    return doc;
  },
  docField(name) {
    const doc = this.afDoc();
    return doc && Object.getByString(doc, name);
  },
  displayBill(billIdName) {
    const billId = this.docField(billIdName);
    debugAssert(billId);
    return Transactions.findOne(billId).displayInSelect();
  },
  defaultDate() {
    return Clock.currentTime();
  },
  cashPayAccount() {
    const account = Accounts.getByCode(AutoForm.getFieldValue('payAccount'));
    if (account?.category === 'cash') return true;
    return false;
  },
/*  showContractField() {
    const doc = this.afDoc();
    const partnerId = AutoForm.getFieldValue('partnerId');
    const selector = { communityId: doc.communityId, relation: doc.relation, partnerId };
    return (partnerId && Contracts.find(selector).count() > 1) ? undefined : 'hidden';
  }, */
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
  const sourceDoc = AutoForm.getDoc(formId);
  const formDoc = AutoForm.getFormValues(formId).insertDoc;
  const doc = Transactions._transform(_.extend(sourceDoc, formDoc));
  doc.autoAllocate();
  AutoForm.setDoc(doc, formId);
}

Template.Payment_edit.events({
  'change .js-autofill'(event, instance) {
    autoFill();
  },
  'click .js-autofill button'(event, instance) {
    // The click happens beore the line is removed/added, so here we do not yet see the changed doc
    const formId = AutoForm.getFormId();  // The delayed call will need to be told, what formId is
    Meteor.setTimeout(() => {
      autoFill(formId);
      instance.viewmodel.billsView(instance.viewmodel.afDoc(formId).bills?.length);
    }, 1000);
  },
  'click .js-create[data-entity="bill"]'(event, instance) {
    const paymentDef = instance.data.doc.txdef();
    const billDef = paymentDef.correspondingBillDef();
    const doc = {
      relation: AutoForm.getFieldValue('relation'),
      partnerId: AutoForm.getFieldValue('partnerId'),
    };
    Transactions.actions.create({ entity: 'bill', txdef: billDef }, doc).run(event, instance);
  },
  'click .js-view-mode'(event, instance) {
    instance.viewmodel.billsView(true);
  },
});
