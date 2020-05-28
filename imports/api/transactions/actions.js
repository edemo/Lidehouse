import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { getActiveCommunityId, getActivePartnerId, defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { importCollectionFromFile } from '/imports/data-import/import.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/ui_3/views/components/transaction-view.js';
import './entities.js';
import './methods.js';

function fillMissingOptions(options, doc) {
  const mcTxdef = ModalStack.getVar('txdef');
  if (mcTxdef && !options.txdef) options.txdef = mcTxdef; // This happens when new tx action is called from within statementEntry match action
  if (typeof options.entity === 'string') options.entity = Transactions.entities[options.entity];
  if (options.txdef && !options.entity) options.entity = Transactions.entities[options.txdef.category];
  debugAssert(options.entity && options.txdef, 'Either entity or txdef needs to come in the options');
}

Transactions.actions = {
  new: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'new',
    icon: 'fa fa-plus',
    visible: user.hasPermission('transactions.insert', doc),
    run() {
      fillMissingOptions(options);
      const entity = options.entity;
      doc = _.extend(defaultNewDoc(), doc);
      doc.category = entity.name;
      doc.defId = options.txdef._id;
      _.each(options.txdef.data, (value, key) => doc[key] = value); // set doc.relation, etc
      let statementEntry = ModalStack.getVar('statementEntry');
      if (statementEntry) {
        // statementEntry = StatementEntries._transform(statementEntry);
        _.deepExtend(doc, {
          // triggers some 'SimpleSchema.clean: filtered out value' because we dont't switch on category
          amount: Math.abs(statementEntry.amount), // payment
          lines: [{ title: statementEntry.note, quantity: 1, unitPrice: Math.abs(statementEntry.amount) }], // receipt
          partnerName: statementEntry.name, // receipt
          valueDate: statementEntry.valueDate,
          issueDate: statementEntry.valueDate, // bill
          deliveryDate: statementEntry.valueDate, // bill
          dueDate: statementEntry.valueDate, // bill
          payAccount: statementEntry.account, // receipt, payment
          fromAccount: statementEntry.account, // transfer
          toAccount: statementEntry.account, // transfer
        });
      }
      doc = Transactions._transform(doc);

      Modal.show('Autoform_modal', {
        body: entity.editForm,
        bodyContext: { doc },
        // --- --- --- ---
        id: `af.${entity.name}.insert`,
        collection: Transactions.simpleSchema(doc),
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
    visible: doc && (user.hasPermission('transactions.inCommunity', doc) || getActivePartnerId() === doc.partnerId),
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
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: doc && !doc.isPosted() && !(doc.category === 'bill' && doc.relation === 'member') // cannot edit manually, use parcel billing
      && user.hasPermission('transactions.update', doc),
    run() {
      const entity = Transactions.entities[doc.entityName()];
      Modal.show('Autoform_modal', {
        body: entity.editForm,
        bodyContext: { doc },
        // --- --- --- ---
        id: `af.${entity.name}.update`,
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
  post: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'post',
    icon: doc && doc.isPosted() ? 'fa fa-list' : 'fa fa-check-square-o',
    color: doc && doc.isPosted() ? undefined : 'warning',
    label: doc && doc.isPosted() ? 'Accounting view' : 'post',
    visible: doc && !(doc.category === 'bill' && !doc.hasConteerData())
      && user.hasPermission('transactions.post', doc),
    run() {
      if (doc.isPosted()) {
        Modal.show('Modal', {
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
        doc.makeJournalEntries(doc.community().settings.accountingMethod);
        Modal.confirmAndCall(Transactions.methods.post, { _id: doc._id }, {
          action: 'post transaction',
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
  resend: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'resend',
    icon: 'fa fa-envelope',
    visible: doc && doc.isPosted() && user.hasPermission('transactions.resend', doc),
    run() {
      Modal.confirmAndCall(Transactions.methods.resend, { _id: doc._id }, {
        action: 'resend email',
        message: 'This will send the bill again',
      });
    },
  }),
  registerPayment: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'registerPayment',
    icon: 'fa fa-credit-card',
    color: 'info',
    visible: doc && (doc.status === 'posted') && (doc.category === 'bill') && doc.outstanding
      && user.hasPermission('transactions.insert', doc),
    run() {
      ModalStack.setVar('billId', doc._id);
      const txdef = Txdefs.findOne({ communityId: doc.communityId, category: 'payment', 'data.relation': doc.relation });
      const paymentOptions = _.extend({}, options, { entity: Transactions.entities.payment, txdef });
      const paymentTx = {
        category: 'payment',
        defId: txdef._id,
        valueDate: new Date(),
        // - copied from the doc -
        relation: doc.relation,
        partnerId: doc.partnerId,
        membershipId: doc.membershipId,
        contractId: doc.contractId,
        amount: doc.amount,
        bills: [{ id: doc._id, amount: doc.amount }],
      };
//      const paymentDoc = Transactions._transform(paymentTx);
      Transactions.actions.new(paymentOptions, paymentTx).run();
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('transactions.remove', doc),
    run() {
      Modal.confirmAndCall(Transactions.methods.remove, { _id: doc._id }, {
        action: 'delete transaction',
        message: doc.isPosted() ? 'Remove not possible after posting' : 'It will disappear forever',
      });
    },
  }),
};

Transactions.dummyDoc = {
  communityId: getActiveCommunityId(),
  isPosted() { return false; },
  isReconciled() { return false; },
};

Transactions.batchActions = {
  post: new BatchAction(Transactions.actions.post, Transactions.methods.batch.post, {}, Transactions.dummyDoc),
  delete: new BatchAction(Transactions.actions.delete, Transactions.methods.batch.remove),
};

//-------------------------------------------------

Transactions.categoryValues.forEach(category => {
  AutoForm.addModalHooks(`af.${category}.insert`);
  AutoForm.addModalHooks(`af.${category}.update`);

  AutoForm.addHooks(`af.${category}.insert`, {
    docToForm(doc) {
      return doc;
    },
    formToDoc(doc) {
      console.log("doc in af:", doc);
      if (category === 'bill' || category === 'receipt') {
        doc.lines = _.without(doc.lines, undefined);
      } else if (category === 'payment') {
        doc.bills = doc.bills || [];
        const modalStackBillId = ModalStack.getVar('billId');
        if (!doc.bills.length && modalStackBillId) {
          doc.bills = [{ id: modalStackBillId, amount: doc.amount }];
        }
        const billId = doc.bills[0].id;
        const bill = Transactions.findOne(billId);
        doc.relation = bill.relation;
        doc.partnerId = bill.partnerId;
        // on the server it will be checked all bills match
/*        _.each(doc.bills, (bp, index) => {
          const billId = bp.id;
          const bill = Transactions.findOne(billId);
          if (index === 0) {
            doc.relation = bill.relation;
            doc.partnerId = bill.partnerId;
            doc.membershipId = bill.membershipId;
            doc.contractId = bill.contractId;
          } else {
            productionAssert(doc.relation === bill.relation, 'All paid bills need to have same relation');
            productionAssert(doc.partnerId === bill.partnerId, 'All paid bills need to have same partner');
            productionAssert(doc.membershipId === bill.membershipId, 'All paid bills need to have same membership');
            productionAssert(doc.contractId === bill.contractId, 'All paid bills need to have same contract');
          }
        }); */
      }
      return doc;
    },
  });
});
