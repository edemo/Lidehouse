import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import '/imports/ui_3/views/modals/modal-guard.js';
import { Clock } from '/imports/utils/clock';
// The autoform needs to see these, to handle new events on it
import '/imports/api/partners/actions.js';
import '/imports/api/contracts/actions.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import '/imports/api/accounting/actions.js';
import './payment-edit.html';

Template.Payment_edit.viewmodel({
  billsView: false,
  linesView: false,
  payAccountNeeded: false,
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = getActiveCommunityId();
      const contractId = AutoForm.getFieldValue('contractId');
      if (contractId) instance.subscribe('transactions.byPartnerContract', { communityId, contractId, outstanding: true });
    });
    const community = getActiveCommunity();
    const doc = this.templateInstance.data.doc;
    const needToAllocateToBills = _.contains(community.settings.paymentsToBills, doc.relation);
    this.billsView(!!doc.bills?.length || needToAllocateToBills);
    this.linesView(doc.subType() !== 'remission' && !needToAllocateToBills);
    this.payAccountNeeded(doc.subType() !== 'remission');
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
  markNullLine(afLine) {
    // As in autoform ArrayTracker remove - item will be hidden
    const index = afLine.name.split('.')[1];
    const arrayName = afLine.arrayFieldName;
    const doc = this.templateInstance.data.doc;
    if (doc[arrayName]?.[index] === null) {
      afLine.removed = true;
      AutoForm.arrayTracker.info[afLine.formId][arrayName].deps?.changed();
    }
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
    const community = getActiveCommunity();
    Meteor.setTimeout(() => {
      autoFill(formId);
      instance.viewmodel.billsView(instance.viewmodel.afDoc(formId).bills?.length
        || _.contains(community.settings.paymentsToBills, instance.viewmodel.afDoc(formId).relation));
    }, 1000);
  },
  'click .js-create[data-entity="bill"]'(event, instance) {
    const payment = instance.data.doc;
    const billDef = payment.correspondingBillTxdef();
    const doc = {
      category: 'bill',
      relation: AutoForm.getFieldValue('relation'),
      partnerId: AutoForm.getFieldValue('partnerId'),
      contractId: AutoForm.getFieldValue('contractId'),
    };
    ModalStack.setVar('newDoc', null, true);  // This is to shadow the previous payment newDoc
    Transactions.actions.create({ entity: 'bill', txdef: billDef }, doc).run(event, instance);
  },
  'click .js-view-mode'(event, instance) {
    instance.viewmodel.billsView(true);
  },
});
