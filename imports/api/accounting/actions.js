import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { displayError } from '/imports/ui_3/lib/errors.js';
import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { getActiveCommunityId, defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { getActivePartnerId } from '/imports/ui_3/lib/active-partner.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Txdefs } from '/imports/api/accounting/txdefs/txdefs.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { StatementEntries } from '/imports/api/accounting/statement-entries/statement-entries.js';

import '/imports/ui_3/views/components/transaction-view.js';
import '/imports/ui_3/views/components/transaction-edit.js';
import '/imports/ui_3/views/components/bill-view.js';
import '/imports/ui_3/views/components/bill-edit.js';
import '/imports/ui_3/views/components/payment-view.js';
import '/imports/ui_3/views/components/payment-edit.js';
import '/imports/ui_3/views/components/transfer-edit.js';
import '/imports/ui_3/views/components/exchange-edit.js';

import './entities.js';
import './methods.js';

function figureOutEntity(options, doc) {
  const defId = doc.defId || options.txdef?._id;
//    || AutoForm.getFieldValue('defId') || ModalStack.getVar('defId');
  debugAssert(defId);
  const txdef = Txdefs.findOne(defId);
  if (!doc.defId) Transactions.setTxdef(doc, txdef);
  let entity = options.entity || txdef.category;
//    || doc.category || AutoForm.getFieldValue('category') || ModalStack.getVar('category');
  debugAssert(entity);
  if (typeof entity === 'string') entity = Transactions.entities[entity];
  return entity;
}
/*
function prefillDocWhenReconciling(doc) {
  const statementEntry = ModalStack.getVar('statementEntry');
  if (statementEntry) {
    _.deepExtend(doc, statementEntry?.match?.tx);
    doc.defId = AutoForm.getFieldValue('defId') || doc.defId; // the form choice overrides the match recommendation
  }
}
*/
Transactions.actions = {
  create: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'create',
    label: `${__('new') + ' ' + __('transaction')}`,
    icon: 'fa fa-plus',
    color: 'primary',
    visible: user.hasPermission('transactions.insert', doc),
    run() {
      const modalStackNewDoc = ModalStack.getVar('newDoc');
//      debugAssert(!modalStackNewDoc || !doc, 'Pass in a doc either way, but not through both');
      doc = _.extend(defaultNewDoc(), modalStackNewDoc, doc);
      const entity = figureOutEntity(options, doc);
      doc = Transactions._transform(doc);
      const fillFromStatementEntry = function fillFromStatementEntry(instance) {
        let statementEntry = ModalStack.getVar('statementEntry');
        if (statementEntry) {
          const formId = instance.data.id;
          const doc = Transactions._transform(AutoForm.getDoc(formId));
          statementEntry = StatementEntries._transform(statementEntry);
          doc.fillFromStatementEntry(statementEntry);
          AutoForm.setDoc(doc, formId);
        }
      };
      doc.autoAllocate?.();

      Modal.show('Autoform_modal', {
        body: entity.editForm,
        bodyContext: { doc },
        onRendered: fillFromStatementEntry,
        // --- --- --- ---
        id: `af.${entity.name}.create`,
        schema: Transactions.simpleSchema(doc),
        fields: entity.fields,
        omitFields: entity.omitFields && entity.omitFields(),
        doc,
        type: 'method',
        meteormethod: 'transactions.insert',
        // --- --- --- ---
        size: entity.size || 'md',
//        validation: entity.editForm ? 'blur' : undefined,
//        btnOK: `Insert ${entity.name}`,
      });
    },
  }),
  import: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'import',
    icon: 'fa fa-upload',
    visible: user.hasPermission('transactions.upsert', doc),
    run: () => importCollectionFromFile(Transactions, options),
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: doc?._id && (user.hasPermission('transactions.inCommunity', doc) || doc.contract()?.entitledToView(user)),
    run() {
      const entity = Transactions.entities[doc.entityName()];
      Modal.show('Autoform_modal', {
        body: entity.viewForm,
        bodyContext: { doc },
        // --- --- --- ---
        id: `af.${entity.name}.view`,
        schema: Transactions.simpleSchema({ category: entity.name }),
        fields: entity.fields,
        omitFields: entity.omitFields && entity.omitFields(),
        doc,
        type: 'readonly',
        // --- --- --- ---
        size: entity.size || 'md',
      });
    },
  }),
  post: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'post',
    icon: doc?._id && doc.isPosted() ? 'fa fa-list' : 'fa fa-check-square-o',
    color: doc?._id && doc.isPosted() ? undefined : 'warning',
    label: doc?._id && doc.isPosted() ? 'Accounting view' : 'post',
    visible: doc?._id && !(doc.category === 'bill' && !doc.hasConteerData())
      && user.hasPermission('transactions.post', doc),
    run() {
      if (doc.isPosted()) {
        Modal.show('Modal', {
          id: 'accounting.view',
          title: 'Accounting view',
          body: 'Transaction_view',
          bodyContext: { doc },
          size: 'lg',
        });
      } else {
//        if (options.batch) {
//          Transactions.methods.post.call({ _id: doc._id }, onSuccess((res) => {
//            displayMessage('info', 'actionDone_post');
//          })
//          );
//        } else {
        doc = Transactions.withJournalEntries(doc);
        Modal.confirmAndCall(Transactions.methods.post, { _id: doc._id }, {
          action: 'post',
          entity: 'transaction',
//            message: 'This will create the following journal entries',
          body: 'Transaction_view',
          bodyContext: { doc },
          size: 'lg',
        });
//      } else {
//        Transactions.methods.post.call({ _id: doc._id }, onSuccess((res) => {
//          displayMessage('info', 'Szamla konyvelesbe kuldve');
//        }));
      }
    },
  }),
  repost: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'repost',
    icon: 'fa fa-check-square-o',
    visible: doc?._id && doc.isPosted() && user.super, // user.hasPermission('transactions.post', doc),
    run() {
      doc.makeJournalEntries(doc.community().settings.accountingMethod);
      Modal.confirmAndCall(Transactions.methods.post, { _id: doc._id }, {
        action: 'repost',
        entity: 'transaction',
//            message: 'This will create the following journal entries',
        body: 'Transaction_view',
        bodyContext: { doc },
        size: 'lg',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: doc?._id && !(doc.isPosted() && doc.isPetrified())
//      && !(doc.category === 'bill' && doc.relation === 'member') // cannot edit manually, use parcel billing
      && user.hasPermission('transactions.update', doc),
    run() {
      const entity = Transactions.entities[doc.entityName()];
      Modal.show('Autoform_modal', {
        body: entity.editForm,
        bodyContext: { doc },
        description: doc.isPosted() && 'You are now editing a transaction that is already posted',
        // --- --- --- ---
        id: `af.${entity.name}.edit`,
        schema: Transactions.simpleSchema({ category: entity.name }),
        fields: entity.fields,
        omitFields: entity.omitFields && entity.omitFields(),
        doc,
        type: 'method-update',
        meteormethod: 'transactions.update',
        singleMethodArgument: true,
        // --- --- --- ---
        size: entity.size || 'md',
//        validation: entity.editForm ? 'blur' : undefined,
      });
    },
  }),
  reallocate: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'reallocate',
    label: 'reallocate',
    icon: 'fa fa-edit',
    visible: doc?._id && doc.isPosted() && (doc.category === 'payment') && user.hasPermission('transactions.update', doc),
    run() {
      const entity = Transactions.entities[doc.entityName()];
      Modal.show('Autoform_modal', {
        body: entity.editForm,
        bodyContext: { doc },
        // --- --- --- ---
        id: `af.${entity.name}.edit`,
        schema: Transactions.simpleSchema({ category: entity.name }),
        fields: entity.fields,
        omitFields: entity.omitFields && entity.omitFields(),
        doc,
        type: 'method-update',
        meteormethod: 'transactions.reallocate',
        singleMethodArgument: true,
        // --- --- --- ---
        size: entity.size || 'md',
//        validation: entity.editForm ? 'blur' : undefined,
      });
    },
  }),
  resend: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'resend',
    icon: 'fa fa-envelope',
    visible: doc?._id && doc.category === 'bill' && doc.isPosted() && doc.outstanding && user.hasPermission('transactions.post', doc),
    run() {
      Modal.confirmAndCall(Transactions.methods.resend, { _id: doc._id }, {
        action: 'resend',
        entity: 'email',
        message: 'This will send the bill again',
      });
    },
  }),
  registerPayment: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'registerPayment',
    label: 'registerPayment',
    icon: 'fa fa-credit-card',
    color: 'info',
    visible: doc?._id && doc.community().settings.paymentsWoStatement && doc?.category === 'bill' && doc.outstanding && !(doc.availableAmountFromOverPayment() > 0)
      && user.hasPermission('transactions.insert', doc),
    run() {
      ModalStack.setVar('billId', doc._id);
      const paymentDef = doc.correspondingPaymentTxdef();
      const paymentOptions = _.extend({}, options, { entity: Transactions.entities.payment, txdef: paymentDef });
      const paymentAmount = doc.outstanding;
      const paymentTx = {
        category: 'payment',
        defId: paymentDef._id,
        valueDate: new Date(),
        // - copied from the doc -
        relation: doc.relation,
        partnerId: doc.partnerId,
        contractId: doc.contractId,
        amount: paymentAmount,
        bills: [{ id: doc._id, amount: paymentAmount }],
      };
//      const paymentDoc = Transactions._transform(paymentTx);
      Transactions.actions.create(paymentOptions, paymentTx).run();
    },
  }),
/*  connectPayment: (options, doc, user = Meteor.userOrNull()) => {
    const connectablePayment = doc.outstanding && (doc.category === 'bill') &&
      Transactions.findOne({ communityId: doc.communityId, category: 'payment', partnerId: doc.partnerId, outstanding: { $ne: 0 } });
    return {
      name: 'connectPayment',
      label: 'connectPayment',
      icon: 'fa fa-credit-card',
      color: 'warning',
      visible: connectablePayment && user.hasPermission('transactions.update', doc),
      run() {
        ModalStack.setVar('billId', doc._id);
        if (connectablePayment.isPosted()) {
          Transactions.actions.reallocate({}, connectablePayment).run();
        } else Transactions.actions.edit({}, connectablePayment).run();
      },
    };
  },*/
  registerIdentification: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'registerIdentification',
    label: 'registerIdentification',
    icon: 'fa fa-arrow-circle-left',
    color: 'warning',
    visible: doc?._id && doc.isPosted() && doc.category === 'bill' && doc.outstanding && (doc.outstanding < 0 || doc.availableAmountFromOverPayment() > 0) && user.hasPermission('transactions.update', doc),
    run() {
      ModalStack.setVar('billId', doc._id);
      const overpayment = doc.availableAmountFromOverPayment();
      debugAssert(doc.outstanding < 0 || overpayment > 0, 'Can only use this action when there is overpayment on this partner contract');
      const paymentDef = doc.correspondingIdentificationTxdef();
      const paymentOptions = _.extend({}, options, { entity: Transactions.entities.payment, txdef: paymentDef });
      const paymentAmount = Math.min(doc.outstanding, overpayment);
      const paymentTx = {
        category: 'payment',
        defId: paymentDef._id,
        valueDate: new Date(),
        // - copied from the doc -
        relation: doc.relation,
        partnerId: doc.partnerId,
        contractId: doc.contractId,
        amount: paymentAmount,
        bills: [{ id: doc._id, amount: paymentAmount }],
      };
//      const paymentDoc = Transactions._transform(paymentTx);
      Transactions.actions.create(paymentOptions, paymentTx).run();
    },
  }),
  registerRemission: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'registerRemission',
    label: 'registerRemission',
    icon: 'fa fa-times',
    visible: doc?._id && doc.isPosted() && doc.category === 'bill' && doc.outstanding && user.hasPermission('transactions.update', doc),
    run() {
      ModalStack.setVar('billId', doc._id);
      const paymentDef = doc.correspondingRemissionTxdef();
      const paymentOptions = _.extend({}, options, { entity: Transactions.entities.payment, txdef: paymentDef });
      const paymentAmount = doc.outstanding;
      const paymentTx = {
        category: 'payment',
        defId: paymentDef._id,
        valueDate: new Date(),
        // - copied from the doc -
        relation: doc.relation,
        partnerId: doc.partnerId,
        contractId: doc.contractId,
        amount: paymentAmount,
        bills: [{ id: doc._id, amount: paymentAmount }],
      };
//      const paymentDoc = Transactions._transform(paymentTx);
      Transactions.actions.create(paymentOptions, paymentTx).run();
    },
  }),
  issueLateFee: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'issueLateFee',
    label: 'issueLateFee',
    icon: 'fa fa-line-chart',
    color: (doc?._id && doc.lateValueOutstanding) ? 'warning' : 'info',
    visible: doc?._id && doc.community()?.settings?.latePaymentFees && user.hasPermission('transactions.update', doc) && doc.isPosted() && doc.category === 'bill' && doc.relation === 'member' && doc.hasPotentialLateValueOutstanding(),
    run() {
      ModalStack.setVar('billId', doc._id);
      const billOptions = _.extend({}, options, { entity: Transactions.entities.bill, txdef: doc.defId });
      const billTx = doc.createLateFeeBill();
      billTx.lines = [doc.createLateFeeLine()];
      Transactions.actions.create(billOptions, billTx).run();
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    label: doc?._id && doc.isPosted() ? 'storno' : 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('transactions.remove', doc) && (doc.status !== 'void')
      && (doc.isPosted() ? user.hasPermission('transactions.post', doc) : true),
    run() {
      Modal.confirmAndCall(Transactions.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: 'transaction',
        message: doc.isPosted() ? 'Remove not possible after posting' : 'It will disappear forever',
      });
    },
  }),
};
class BatchIssueLateFeeAction extends BatchAction {
  visible(docs) {
    const allSameContract = _.uniq(_.pluck(docs, 'defId')).length === 1
                          && _.uniq(_.pluck(docs, 'relation')).length === 1
                          && _.uniq(_.pluck(docs, 'partnerId')).length === 1
                          && _.uniq(_.pluck(docs, 'contractId')).length <= 1;
    return allSameContract && _.every(docs, doc => this.action(this.options, doc).visible);
  }
  run(docs) {
    let billOptions, billTx, account, interest;
    _.each(docs, (doc, index) => {
      if (index === 0) {
        billOptions = _.extend({}, { entity: Transactions.entities.bill, txdef: doc.defId });
        billTx = doc.createLateFeeBill();
      }
      billTx.lines.push(doc.createLateFeeLine());
    });
    Transactions.actions.create(billOptions, billTx).run();
  }
}

Transactions.dummyDoc = {
  communityId: getActiveCommunityId,
  isPosted() { return false; },
};

Transactions.batchActions = {
  post: new BatchAction(Transactions.actions.post, Transactions.methods.batch.post, {}, Transactions.dummyDoc),
  resend: new BatchAction(Transactions.actions.resend, Transactions.methods.batch.resend, {}, Transactions.dummyDoc),
  issueLateFee: new BatchIssueLateFeeAction(Transactions.actions.issueLateFee, undefined, {}, Transactions.dummyDoc),
  delete: new BatchAction(Transactions.actions.delete, Transactions.methods.batch.remove, {}, Transactions.dummyDoc),
};

//-------------------------------------------------

Transactions.categoryValues.forEach(category => {
  AutoForm.addModalHooks(`af.${category}.create`);
  AutoForm.addModalHooks(`af.${category}.edit`);

  AutoForm.addHooks(`af.${category}.create`, {
    docToForm(doc) {
      return doc;
    },
    formToDoc(doc) {
      if (category === 'bill' || category === 'receipt') {
        doc.lines = doc.lines?.filter(line => line);       // filters out undefined lines (placeholder)
      } else if (category === 'payment') {
        doc.bills = doc.bills?.filter(bill => bill?.amount);  // filters out undefined lines (placeholder), and zero amount rows
        doc.lines = doc.lines?.filter(line => line?.amount);
      }
      doc.debit = doc.debit?.filter(entry => entry);
      doc.credit = doc.credit?.filter(entry => entry);
/*
      try {
        const tdoc = Transactions._transform(doc);
        tdoc.validate?.();
        return doc;
      } catch (err) {
        displayError(err);
        return false;
      }
*/
      return doc;
    },
  });

  AutoForm.addHooks(`af.${category}.edit`, {
/*
  formToModifier(modifier) {
    try {
      const tdoc = Transactions._transform(doc);
      tdoc.validate?.();
      return doc;
    } catch (err) {
      displayError(err);
      return false;
    }
  },
*/
  });
});
